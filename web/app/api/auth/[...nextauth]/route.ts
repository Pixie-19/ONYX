// Auth.js v5 dynamic catch-all route. The `handlers` object exported from
// `lib/auth.ts` already contains correctly-shaped GET/POST functions — we
// just re-export them. Do NOT wrap them; do NOT export the NextAuth object.
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;

// Force this route to always be dynamic — it must execute per-request so the
// session JSON is fresh and never empty / cached / pre-rendered.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
