/**
 * AmbientMesh — the light page's atmosphere: a soft gradient wash, three
 * drifting colour orbs, and a faint tech grid that fades out down the page.
 *
 * Mounted inside the page rather than the layout, so it can't paint over
 * /courses, /admin or any surface that is still dark. Purely decorative and
 * inert — no pointer events, aria-hidden, and the drift is CSS-only so it
 * costs nothing on the main thread and stops under reduced motion.
 */
export function AmbientMesh() {
  return (
    // z-0, not -z-10: the page wrapper paints an opaque bg-canvas, so a
    // negative z-index would put the whole mesh behind it and render it
    // invisible. Sections sit above via their own `relative` positioning.
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 900px 600px at 15% -5%, rgba(1,28,65,0.10), transparent 60%),' +
            'radial-gradient(ellipse 800px 700px at 100% 10%, rgba(34,166,247,0.16), transparent 60%),' +
            'radial-gradient(ellipse 700px 600px at 50% 100%, rgba(20,102,222,0.10), transparent 55%)',
        }}
      />

      {/* Drifting orbs. motion-reduce:animate-none keeps them still for
          anyone who has asked for less movement. */}
      <div className="absolute -left-24 top-16 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#3B4C74,#011C41)] opacity-[0.18] blur-[60px] motion-safe:animate-orbit-spin-slow motion-reduce:animate-none" />
      <div className="absolute -right-20 top-80 h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#7CC8FB,#1466DE)] opacity-25 blur-[60px] motion-safe:animate-orbit-spin motion-reduce:animate-none" />
      <div className="absolute left-[40%] top-[900px] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#7CC8FB,#22A6F7)] opacity-20 blur-[60px] motion-safe:animate-orbit-spin-slow motion-reduce:animate-none" />

      {/* Tech grid, masked so it only reads near the top of the page */}
      <div className="fl-tech-grid absolute inset-0" />
    </div>
  );
}
