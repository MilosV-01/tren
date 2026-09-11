/** Split-flap style digit tiles, e.g. for "photos remaining on this roll". */
export function FlipCounter({ value, digits = 2 }: { value: number; digits?: number }) {
  const str = String(Math.max(0, value)).padStart(digits, '0');
  return (
    <div className="inline-flex gap-1" role="status" aria-label={`${value}`}>
      {[...str].map((ch, i) => (
        <span key={i} className="flip-tile">
          {ch}
        </span>
      ))}
    </div>
  );
}
