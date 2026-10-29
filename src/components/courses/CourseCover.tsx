import { CoverImage } from './CoverImage';

// Three glows so neighbouring cards don't look identical; a category always
// gets the same one.
const GLOWS = [
  'radial-gradient(120% 90% at 100% 0%, rgba(20, 102, 222, 0.75) 0%, transparent 60%)',
  'radial-gradient(110% 90% at 0% 100%, rgba(34, 166, 247, 0.5) 0%, transparent 60%)',
  'radial-gradient(120% 90% at 100% 100%, rgba(91, 123, 251, 0.6) 0%, transparent 60%)',
];

function glowFor(key: string) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GLOWS[h % GLOWS.length];
}

/**
 * The picture at the top of a course card and of the course page's side
 * card: the course image when it has one, otherwise a navy cover with the
 * category and the FutureLine mark. `children` are overlays (badges).
 */
export function CourseCover({
  category,
  image,
  className = '',
  children,
}: {
  category: string | null;
  image?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-navy ${className}`}
      style={{
        backgroundImage: `${glowFor(category ?? '')}, repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 14px)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/futureline-mark-white.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-[12%] -end-[6%] h-[88%] w-auto opacity-[0.09]"
      />
      {category && (
        <p
          dir="auto"
          className="absolute bottom-4 start-4 end-16 text-lg font-semibold leading-snug text-white/95 rtl:text-right"
        >
          {category}
        </p>
      )}
      {image && <CoverImage src={image} />}
      {children}
    </div>
  );
}
