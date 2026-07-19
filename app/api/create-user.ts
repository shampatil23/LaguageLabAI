import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless entry for secure user creation via Firebase Identity Toolkit.
// POST /api/create-user  { email, password }  ->  { uid: "..." }

const UPSTREAM_TIMEOUT_MS = 20_000;

async function safeJson(resp: Response): Promise<any | null> {
  const ct = resp.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try { return await resp.json(); } catch { return null; }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Config check — no hardcoded fallback key. A missing env var is a clear
  // configuration error, not an opaque 500.
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.error('[create-user] VITE_FIREBASE_API_KEY is not configured on the server');
    return res.status(503).json({
      error: 'User creation service is not configured on the server.',
      details: 'Missing VITE_FIREBASE_API_KEY environment variable. Add it in Vercel Project Settings → Environment Variables, then redeploy.',
    });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const { email, password } = body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
        signal: controller.signal,
      },
    );
  } catch (err) {
    clearTimeout(timer);
    if (isAbortError(err)) {
      return res.status(504).json({ error: 'Firebase sign-up timed out. Please try again.' });
    }
    console.error('[create-user] upstream fetch failed', err);
    return res.status(502).json({ error: 'Could not reach Firebase.' });
  }
  clearTimeout(timer);

  const data = await safeJson(upstream);
  if (!upstream.ok) {
    return res.status(400).json({ error: data?.error?.message || 'Failed to create user' });
  }

  return res.status(200).json({ uid: data?.localId });
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message));
}
