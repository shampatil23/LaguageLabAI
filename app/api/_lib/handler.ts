// Shared request handler for the AI engine — used by both the Vercel
// serverless function (api/ai.ts) and the Express dev/prod server (server.ts).

import { runAgent, sanitizePayload, AGENTS } from './agents';

// ── Simple in-memory rate limiter (per uid/IP) ──────────────────────────────
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20; // per identity per minute
const buckets = new Map<string, { count: number; reset: number }>();

function rateLimited(id: string): boolean {
  const now = Date.now();
  const b = buckets.get(id);
  if (!b || now > b.reset) {
    buckets.set(id, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  b.count++;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  }
  return b.count > MAX_REQUESTS;
}

export interface AiRequestBody {
  agent?: string;
  payload?: any;
  uid?: string;
}

export async function handleAiRequest(
  body: AiRequestBody,
  clientId: string,
): Promise<{ status: number; body: any }> {
  const agent = typeof body?.agent === 'string' ? body.agent : '';
  if (!agent || !AGENTS[agent]) {
    return { status: 400, body: { ok: false, error: 'Invalid or missing agent name' } };
  }

  const identity = body?.uid ? `u:${body.uid}` : `ip:${clientId}`;
  if (rateLimited(identity)) {
    return {
      status: 429,
      body: { ok: false, error: 'You are going a little fast! Please wait a minute and try again.' },
    };
  }

  const payload = sanitizePayload(body?.payload ?? {});
  const result = await runAgent(agent, payload);

  if (!result.ok) {
    // Graceful, user-safe message — internals stay in server logs only.
    return { status: 503, body: { ok: false, error: result.error } };
  }
  return {
    status: 200,
    body: { ok: true, agent, provider: result.provider, text: result.text, json: result.json },
  };
}
