'use client';

/**
 * Root-level error boundary — catches errors in the root layout itself.
 * Must include its own <html> and <body> since the root layout may have failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error for debugging (can't use useEffect in global-error since it provides its own html/body)
  if (typeof window !== 'undefined') {
    console.error('Global error:', error);
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ecfdf5, #fef3c7)',
          padding: '1rem',
        }}>
          <div style={{
            maxWidth: '28rem',
            width: '100%',
            textAlign: 'center',
            background: 'white',
            borderRadius: '1rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
            padding: '2rem',
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🥀</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
              An unexpected error occurred. Let&apos;s try again.
            </p>
            <button
              onClick={reset}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
