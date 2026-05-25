'use client';

export const dynamic = 'force-dynamic';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        height: '100vh',
        background: '#040608',
        color: '#c9d5e3',
        fontFamily: 'JetBrains Mono, SF Mono, Consolas, monospace',
        display: 'grid',
        placeItems: 'center',
        padding: 40,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 540 }}>
          <div style={{ fontSize: 48, letterSpacing: '0.32em', color: '#22e8ff', textShadow: '0 0 8px #22e8ff' }}>
            ONYX
          </div>
          <div style={{ fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', color: '#7a8a9c', marginTop: 6 }}>
            UNRECOVERABLE EXCEPTION
          </div>
          <div style={{
            marginTop: 20,
            padding: 12,
            border: '1px solid rgba(255, 93, 111, 0.5)',
            background: 'rgba(255, 93, 111, 0.06)',
            color: '#ff5d6f',
            fontSize: 11,
            textAlign: 'left',
            wordBreak: 'break-word',
          }}>
            {error.message ?? 'Unknown error'}
            {error.digest && <div style={{ marginTop: 6, opacity: 0.7 }}>DIGEST · {error.digest}</div>}
          </div>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: '6px 14px',
              fontSize: 10,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              background: 'transparent',
              border: '1px solid rgba(34, 232, 255, 0.6)',
              color: '#22e8ff',
              cursor: 'pointer',
            }}
          >RESET STATE</button>
        </div>
      </body>
    </html>
  );
}
