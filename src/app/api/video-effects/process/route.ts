/**
 * POST /api/video-effects/process
 * -----------------------------------------------------------------
 * MVP video-effects-as-a-service endpoint. Accepts a multipart
 * upload (one video file + one effect preset name), runs ffmpeg
 * with the matching filter graph, and returns the processed video.
 *
 * Inspired by an Instagram post by abdullrhman_ha — the FL Academy
 * lab demonstration of "use AI to generate visual code, ship video
 * tools in days, not months." This is the MVP version: 4 fixed
 * presets, server-side ffmpeg, no AI-generated shaders yet.
 *
 * Constraints:
 *  - 50 MB upload cap (web video for ~30s at decent quality)
 *  - 60s timeout on the ffmpeg process
 *  - MP4/H.264 output regardless of input format
 *  - Files written to public/uploads/video-effects/ — same
 *    static-serving pattern as instructor photos. Local FS works
 *    in dev. Production on serverless needs swapping for cloud
 *    storage; see the upload-image endpoint for the same caveat.
 *
 * Access: signed-in users only, one job at a time, rate-limited per
 * account. Cleanup: files older than an hour are deleted before each job.
 */
import { NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { spawn } from 'child_process';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit, getRateLimitHeaders } from '@/lib/rateLimit';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const FFMPEG_TIMEOUT_MS = 60_000; // 60s — hard upper bound
const OUTPUT_TTL_MS = 60 * 60 * 1000; // processed files are kept for 1 hour
// One encode at a time: the server has 2 GB of RAM. Module state is enough
// because production runs a single Node process (PM2 fork mode).
const MAX_CONCURRENT_JOBS = 1;
let activeJobs = 0;

// Preset → FFmpeg filter graph. Each is one chain of filters applied
// in sequence to the input video. All produce H.264 MP4 output.
// Designed to be readable + tweakable rather than maximally elegant.
const PRESETS: Record<string, { label: string; filter: string }> = {
  glow: {
    label: 'Cinematic Glow',
    // Split → blur one branch → screen-blend back over original.
    // Result: bloom around highlights. Then a manual warm grade via
    // explicit curve points (FFmpeg 8's curves=preset=... is broken,
    // so we hand-encode the equivalent of the "warmer" preset).
    filter:
      "split=2[base][blur];[blur]boxblur=12:1[blurred];" +
      "[base][blurred]blend=all_mode=screen:all_opacity=0.4," +
      "eq=brightness=0.04:saturation=1.15," +
      "curves=red='0/0 0.5/0.58 1/1':blue='0/0 0.5/0.42 1/0.9':green='0/0 0.5/0.52 1/0.98'",
  },
  neon: {
    label: 'Neon Cyberpunk',
    // Lift blues + crush reds in highlights, pump saturation,
    // add film-grain shimmer. Reads as "synthwave / dark city."
    filter:
      "curves=blue='0/0.15 0.5/0.65 1/1':red='0/0 0.5/0.55 1/0.85'," +
      "eq=contrast=1.25:saturation=1.45," +
      "noise=alls=6:allf=t+u",
  },
  dark: {
    label: 'Dark Aesthetic',
    // Crush shadows, slight desat, vignette. Reads as "moody portrait
    // / fashion editorial." Pairs well with portrait subjects.
    filter:
      "eq=contrast=1.35:brightness=-0.06:saturation=0.85," +
      "curves=blue='0/0.08 0.5/0.5 1/1':green='0/0 0.5/0.45 1/0.92'," +
      "vignette=PI/3",
  },
  vintage: {
    label: 'Vintage Film',
    // Warm shift + reduced saturation + grain + soft vignette.
    // Reads as "Super-8 / nostalgia footage."
    filter:
      "colorbalance=rs=0.15:gs=0.05:bs=-0.1," +
      "eq=saturation=0.55:brightness=0.02," +
      "noise=alls=10:allf=t," +
      "vignette=PI/4",
  },
};

export async function POST(req: Request) {
  // Signed-in users only: each job is an expensive ffmpeg encode that
  // writes to disk, so anonymous access let anyone exhaust the server.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Sign in to use the video lab.' }, { status: 401 });
  }

  const rl = await rateLimit(`video-effects:${session.user.id}`, 5, 5 * 60 * 1000);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a few minutes.' },
      { status: 429, headers: getRateLimitHeaders(rl.remaining, rl.resetIn) },
    );
  }

  // Refuse oversized uploads before buffering them (1 MB allows for the
  // multipart framing around the file).
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BYTES + 1024 * 1024) {
    return NextResponse.json(
      { error: `Video too large. Max ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 },
    );
  }

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return NextResponse.json(
      { error: 'The lab is busy with another video. Please try again in a minute.' },
      { status: 503, headers: { 'Retry-After': '30' } },
    );
  }

  activeJobs++;
  let inputPath = '';
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const preset = String(formData.get('preset') ?? 'glow');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No video file in request.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Video too large. Max ${MAX_BYTES / 1024 / 1024} MB.` },
        { status: 400 },
      );
    }
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'File must be a video.' }, { status: 400 });
    }
    // Own keys only: a bare lookup accepts inherited names like "constructor".
    const config = Object.hasOwn(PRESETS, preset) ? PRESETS[preset] : undefined;
    if (!config) {
      return NextResponse.json(
        { error: `Unknown effect "${preset}". Pick one of: ${Object.keys(PRESETS).join(', ')}` },
        { status: 400 },
      );
    }

    // Write input to a temp slot the FFmpeg subprocess can read.
    const dir = join(process.cwd(), 'public', 'uploads', 'video-effects');
    await mkdir(dir, { recursive: true });
    await removeOldOutputs(dir);
    const id = randomBytes(8).toString('hex');
    inputPath = join(dir, `${id}-in.mp4`);
    const outputPath = join(dir, `${id}-${preset}.mp4`);

    const bytes = await file.arrayBuffer();
    await writeFile(inputPath, Buffer.from(bytes));

    // Spawn FFmpeg with the chosen filter chain.
    //   -y                  overwrite output
    //   -i <input>          input file
    //   -t 30               cap output at 30s (server cost control)
    //   -vf "<filter>"      apply video filter chain
    //   -c:v libx264        H.264 video codec (most-compatible)
    //   -preset fast        encoding speed/quality balance
    //   -crf 23             quality target (sane default)
    //   -c:a aac -b:a 128k  re-encode audio (some inputs are weird)
    //   -movflags +faststart  put MOOV box first → browser streams
    //                       the file while it's still downloading
    const args = [
      '-y',
      '-i', inputPath,
      '-t', '30',
      '-vf', config.filter,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputPath,
    ];

    await runFfmpeg(args, FFMPEG_TIMEOUT_MS);

    // Cleanup the input — we don't need it anymore.
    await unlink(inputPath).catch(() => {});
    inputPath = '';

    if (!existsSync(outputPath)) {
      return NextResponse.json({ error: 'FFmpeg produced no output.' }, { status: 500 });
    }

    return NextResponse.json({
      url: `/uploads/video-effects/${id}-${preset}.mp4`,
      preset,
      label: config.label,
    });
  } catch (err: any) {
    // Best-effort cleanup of partial input.
    if (inputPath) await unlink(inputPath).catch(() => {});
    // ffmpeg's stderr includes server paths: log it, don't send it.
    // eslint-disable-next-line no-console
    console.error('Video effects processing failed:', err);
    return NextResponse.json(
      { error: 'Processing failed. Try a shorter clip or a different format.' },
      { status: 500 },
    );
  } finally {
    activeJobs--;
  }
}

// Delete results older than OUTPUT_TTL_MS. Runs before each job, so the
// folder never holds more than about an hour of output.
async function removeOldOutputs(dir: string) {
  const cutoff = Date.now() - OUTPUT_TTL_MS;
  const names = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    names.map(async (name) => {
      const path = join(dir, name);
      const info = await stat(path).catch(() => null);
      if (info && info.mtimeMs < cutoff) await unlink(path).catch(() => {});
    }),
  );
}

// Spawn FFmpeg with a hard timeout. Resolves on clean exit (code 0),
// rejects with the tail of stderr on non-zero exit or timeout. We
// keep only the last 4KB of stderr to avoid memory blow-up on
// FFmpeg's verbose progress output.
function runFfmpeg(args: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderrTail = '';
    const STDERR_CAP = 4096;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stderr.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_CAP);
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`FFmpeg timed out after ${timeoutMs}ms`));
        return;
      }
      if (code === 0) {
        resolve();
      } else {
        // Surface a clean error — last line of stderr is usually the
        // real cause (codec mismatch, missing stream, etc).
        const lastLine = stderrTail.trim().split('\n').slice(-3).join(' | ');
        reject(new Error(`FFmpeg exited ${code}: ${lastLine}`));
      }
    });
  });
}
