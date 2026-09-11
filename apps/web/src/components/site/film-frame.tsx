function PlayTriangle({ className = 'h-2.5 w-2.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 1.5v9l8-4.5-8-4.5Z" />
    </svg>
  );
}

/**
 * Photo wrapped in a "disposable camera viewfinder" frame — dark chrome, a
 * fake exif readout, and a play-scrubber mark. The signature visual motif
 * across the guest-facing pages.
 */
export function FilmFrame({
  src,
  alt,
  className = '',
  aspect = 'aspect-[4/3]',
  meta = true,
  overlay,
  priority = false,
  placeholder,
}: {
  /** Omit to render the empty/placeholder viewfinder instead of a photo. */
  src?: string;
  alt?: string;
  className?: string;
  aspect?: string;
  meta?: boolean;
  overlay?: React.ReactNode;
  priority?: boolean;
  placeholder?: React.ReactNode;
}) {
  return (
    <div className={`film-frame ${className}`}>
      {meta && (
        <div className="film-frame__meta">
          <span>2000 F 8.0</span>
          <span>D45 / 2.8 120</span>
        </div>
      )}
      <div className="relative">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt ?? ''}
            className={`${aspect} w-full object-cover`}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
          />
        ) : (
          <div className={`${aspect} flex w-full items-center justify-center bg-primary-800 p-6 text-center`}>
            {placeholder}
          </div>
        )}
        {overlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary-900/88 p-6 text-center">
            {overlay}
          </div>
        )}
      </div>
      <div className="film-frame__scrub">
        <PlayTriangle className="h-2.5 w-2.5 text-surface-50/50" />
      </div>
    </div>
  );
}
