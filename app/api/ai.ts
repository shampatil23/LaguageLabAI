// Vercel serverless entry for the AI Learning Engine.
// POST /api/ai  { agent: "<agent-name>", payload: {...}, uid: "<firebase-uid>" }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleAiRequest } from './_lib/handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const { status, body: out } = await handleAiRequest(body, ip);
    return res.status(status).json(out);
  } catch (e) {
    console.error('[ai-engine] handler error', e);
    return res.status(500).json({
      ok: false,
      error: 'Something went wrong on our side. Please try again — your progress is saved.',
    });
  }
}
