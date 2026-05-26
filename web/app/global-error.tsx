'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          height: '100vh',
          background: '#F7F8FA',
          color: '#111827',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          display: 'grid',
          placeItems: 'center',
          padding: 40,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: 540,
            background: '#FFFFFF',
            border: '1px solid #E7EAF0',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04), 0 12px 32px -12px rgba(17, 24, 39, 0.12)',
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em', color: '#111827' }}>
            Unrecoverable exception
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            ONYX hit a fatal error that prevented the application from rendering.
          </div>
          <div
            style={{
              marginTop: 20,
              padding: 12,
              border: '1px solid #FCA5A5',
              background: '#FEF2F2',
              color: '#B91C1C',
              fontSize: 12,
              textAlign: 'left',
              wordBreak: 'break-word',
              borderRadius: 8,
              fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace',
            }}
          >
            {error.message ?? 'Unknown error'}
            {error.digest && (
              <div style={{ marginTop: 6, opacity: 0.7 }}>Digest · {error.digest}</div>
            )}
          </div>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 20,
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: '-0.005em',
              background: '#111827',
              border: '1px solid #111827',
              color: '#FFFFFF',
              cursor: 'pointer',
              borderRadius: 7,
            }}
          >
            Reset application
          </button>
        </div>
      </body>
    </html>
  );
}
