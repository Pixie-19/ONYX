// Helper script — `npm run demo` triggers the cinematic cascade via the
// running agent's REST endpoint. Run this in a second terminal during a
// live demo if you want to fire the cascade from the CLI.

const url = process.env.ONYX_AGENT_HTTP ?? 'http://127.0.0.1:4311';

async function main() {
  const r = await fetch(`${url}/demo/run`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenario: process.argv[2] ?? 'cascade' }),
  });
  const body = await r.json().catch(() => ({}));
  process.stdout.write(JSON.stringify(body, null, 2) + '\n');
}

main().catch((e) => {
  process.stderr.write(String(e) + '\n');
  process.exit(1);
});
