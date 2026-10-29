# Deployment

Production runs on a self-managed VPS (`futureline.ai`). nginx terminates TLS
on 443 and reverse-proxies to the Next.js server on `127.0.0.1:5000`, which is
kept alive by PM2.

> This project was previously hosted on Replit. The `.replit` file and the
> Replit references in `replit.md` are historical and no longer used.

---

## Routine deploy

From the app directory on the server:

```bash
./deploy.sh
```

That fetches `origin/main`, installs dependencies, syncs the database schema,
builds, reloads PM2, and health-checks the result. It prints a rollback command
if the health check fails. Pass a branch name to deploy something other than
`main` (e.g. `./deploy.sh feat/legal-pages`).

**`--legacy-peer-deps` is required, not optional.** The project pins React
18.3.1 while `@react-three/fiber@9` and `@react-three/drei@10` declare a React
19 peer, so a plain `npm ci` fails to resolve.

---

## First-time setup

### 1. Requirements

- Node.js 20+ and npm
- PostgreSQL 16 (local or managed)
- nginx with a TLS certificate for `futureline.ai`
- PM2 (`npm install -g pm2`)

### 2. Environment

Create `.env` in the app directory. It is gitignored — **never commit it**, and
never put credentials in `replit.md`, this file, or any other tracked file.

```bash
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/futureline?schema=public"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="<random-32-byte-secret>"
SESSION_SECRET="<random-32-byte-secret>"

NEXTAUTH_URL="https://futureline.ai"
APP_URL="https://futureline.ai"
NODE_ENV="production"

# Transactional email
RESEND_API_KEY="<resend-api-key>"
RESEND_FROM_EMAIL="noreply@futureline.ai"

# Google sign-in (optional — the button degrades gracefully when unset)
GOOGLE_CLIENT_ID="<client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<client-secret>"

# Proxies in front of the app (rate limits trust only what they add to
# X-Forwarded-For). 1 = nginx only. Use 2 if Cloudflare sits in front of nginx.
TRUSTED_PROXY_COUNT="1"
```

### 3. First boot

```bash
git clone https://github.com/flservicesai-bit/futureline-website-3d.git
cd futureline-website-3d
# create .env as above, then:
npm ci --legacy-peer-deps
npx prisma db push
npm run seed          # ONLY on a fresh database — creates dev accounts
npm run build
pm2 start ecosystem.config.js
pm2 save && pm2 startup   # survive reboots
```

`npm run seed` inserts throwaway accounts with weak passwords. Run it only on
an empty database, and change those passwords immediately if you do. It
deletes all existing data first, so it refuses to run once any user exists;
`SEED_FORCE=yes npm run seed` overrides that for local resets only.

### 4. nginx

```nginx
server {
    listen 443 ssl http2;
    server_name futureline.ai www.futureline.ai;

    # ssl_certificate / ssl_certificate_key managed by certbot

    client_max_body_size 50M;   # the /lab video-effects upload cap

    location / {
        proxy_pass         http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 120s;   # ffmpeg jobs on /lab can be slow
    }
}
```

`X-Forwarded-For` matters: the rate limiter keys on it, and the password-reset
flow falls back to the request host when `APP_URL` is unset.

---

## Things to know

### URLs are locale-prefixed

English lives at `/en/*`, Arabic at `/ar/*`. Unprefixed URLs redirect
(`/courses` → `/en/courses`), so old inbound links keep working.

This is deliberate: `localePrefix: 'as-needed'` triggers an infinite redirect
loop on next-intl 4.13.x + Next 15.5.12 (the default-locale response carries a
rewrite *and* a self-redirect), which took the whole English site down. See the
note in `src/i18n/routing.ts`. Revisit once that upstream bug is fixed. Consider
making the redirects permanent (308) for SEO.

### Database migrations

`deploy.sh` runs `prisma db push`, which is additive and a no-op when the
schema already matches. For destructive changes (dropped or renamed columns),
back up first:

```bash
pg_dump -Fc futureline > backup-$(date +%F).dump
```

### Rollback

```bash
git reset --hard <previous-sha>
npm ci --legacy-peer-deps && npm run build && pm2 reload futureline
```

### Logs

```bash
pm2 logs futureline --lines 100
pm2 status
```

### Secrets hygiene

An admin password was once committed to `replit.md` in this public repo. The
history has been rewritten to remove it, but **orphaned commits remain
retrievable by direct SHA until GitHub garbage-collects them**, so any
credential ever committed must be treated as compromised and rotated. Keep
secrets in `.env` on the server only.
