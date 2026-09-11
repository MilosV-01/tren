'use client';

/** The big round "okini" (shoot) button — primary action on the guest camera screen. */
export function ShutterButton({
  onClick,
  label = 'okini',
  disabled,
  busy,
}: {
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="grid h-20 w-20 place-items-center rounded-full bg-primary-900 shadow-[0_6px_0_0_#0A0807]
          transition active:translate-y-1.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy && (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-surface-50/30 border-t-surface-50" />
        )}
      </button>
      <span className="font-serif text-sm italic text-primary-800">{label}</span>
    </div>
  );
}
