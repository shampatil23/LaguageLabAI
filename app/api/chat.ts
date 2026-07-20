import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless entry for the chat endpoint.
// POST /api/chat  { messages: [{ role, content }, ...] }  ->  { result: "..." }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const UPSTREAM_TIMEOUT_MS = 20_000;

// Parse a Response body as JSON without throwing on HTML/empty bodies.
async function safeJson(resp: Response): Promise<any | null> {
  const ct = resp.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return await resp.json();
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Safe body parsing (Vercel may hand us a string or parsed object)
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const messages = body?.messages;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  // Hardcoded fallback key so the endpoint keeps working on Vercel even when
  // the env var isn't set in the dashboard. Verified valid 2026-07-20.
  // Keep in sync with app/api/_lib/providers.ts and api/ai.ts.
  const FALLBACK_GROQ_KEY = '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';
  const apiKey = process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service is not configured on the server.' });
  }

  // Fetch with a timeout so a hung upstream returns 504, not 500.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, model: GROQ_MODEL }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (isAbortError(err)) {
      return res.status(504).json({ error: 'AI provider timed out. Please try again.' });
    }
    console.error('[chat] upstream fetch failed', err);
    return res.status(502).json({
      error: 'Could not reach the AI provider.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
  clearTimeout(timer);

  const data = await safeJson(upstream);

  if (!upstream.ok) {
    // Pass the upstream status through but never as a raw 500. A non-2xx from
    // Groq (401/429/etc.) is surfaced as 502 with the real reason.
    const reason = data?.error?.message || (data ? JSON.stringify(data) : `Groq responded ${upstream.status}`);
    console.error('[chat] Groq API error', upstream.status, reason);
    return res.status(502).json({ error: 'AI provider returned an error.', details: reason });
  }

  const result = data?.choices?.[0]?.message?.content;
  if (typeof result !== 'string') {
    console.error('[chat] unexpected Groq payload', data);
    return res.status(502).json({ error: 'AI provider returned an unexpected response.' });
  }

  return res.status(200).json({ result });
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message));
}
