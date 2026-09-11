/** Tren camera mark (used for favicon/OG) + the elegant all-caps serif wordmark. */

export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 128 104" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 92 a12 12 0 0 1 -12 -12 V44 a12 12 0 0 1 12 -12 h14 l10 -14 h28 l10 14 h14 a12 12 0 0 1 12 12 v36 a12 12 0 0 1 -12 12"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="64" cy="60" r="22" fill="currentColor" />
      <path d="M74 47 a15 15 0 0 1 7 10" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** The plain "TREN" wordmark used across headers — matches the film-camera brand look. */
export function Wordmark({ className = 'text-xl' }: { className?: string }) {
  return <span className={`wordmark ${className}`}>Tren</span>;
}

export function Logo({
  className = '',
  markClass = 'h-7 w-7',
  textClass = 'text-lg',
}: {
  className?: string;
  markClass?: string;
  textClass?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-primary-900 ${className}`}>
      <LogoMark className={markClass} />
      <Wordmark className={textClass} />
    </span>
  );
}
