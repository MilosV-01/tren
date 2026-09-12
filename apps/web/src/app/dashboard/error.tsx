'use client';

import { useEffect } from 'react';

/**
 * Error boundary for everything under /dashboard. Keeps the layout's header
 * (wordmark, org name, logout) alive when a page underneath it fails — e.g.
 * a slow/cold-starting API — instead of losing the whole navbar to the
 * generic Next.js error screen.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <p className="max-w-sm text-sm text-surface-600">
        Nešto nije uspelo da se učita. Ako se ovo desilo posle duže pauze, server se verovatno budi —
        probaj ponovo za par sekundi.
      </p>
      <button className="btn-primary text-sm" onClick={() => reset()}>
        Pokušaj ponovo
      </button>
    </div>
  );
}
