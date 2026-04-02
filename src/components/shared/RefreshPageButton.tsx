'use client';

/**
 * Client component for page refresh buttons.
 *
 * Server Components cannot use `onClick` or `window`. This tiny wrapper
 * provides a "Refresh Page" button that can be safely imported into
 * server-rendered error fallbacks.
 */
export default function RefreshPageButton({
  children = 'Refresh Page',
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={() => window.location.reload()}
      className={className}
    >
      {children}
    </button>
  );
}
