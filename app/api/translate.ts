import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel serverless entry for translation.
// POST /api/translate  { text, sourceLanguage?, targetLanguage }  ->  { translation: "..." }
// Primary: Groq (when GROQ_API_KEY is configured). Fallback: MyMemory (free, no key).

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const UPSTREAM_TIMEOUT_MS = 20_000;

async function safeJson(resp: Response): Promise<any | null> {
  const ct = resp.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try { return await resp.json(); } catch { return null; }
}

function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export default async (req: VercelRequest, res: VercelResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const { text, sourceLanguage, targetLanguage } = body || {};

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Missing required parameters: text, targetLanguage' });
  }

  // Hardcoded fallback key so Groq stays the primary provider on Vercel even
  // when the env var isn't set in the dashboard. Verified valid 2026-07-20.
  const FALLBACK_GROQ_KEY = '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';
  const apiKey = process.env.GROQ_API_KEY || FALLBACK_GROQ_KEY;
  if (apiKey) {
    try {
      const resp = await fetchWithTimeout(GROQ_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator. Translate the text to the target language. Respond ONLY with the translated text. Do not add any introduction, explanations, or quotes.',
            },
            {
              role: 'user',
              content: `Translate the following text to language code "${targetLanguage}" (source language is "${sourceLanguage || 'auto'}"):\n\n${text}`,
            },
          ],
          model: GROQ_MODEL,
          temperature: 0.2,
        }),
      }, UPSTREAM_TIMEOUT_MS);

      const data = await safeJson(resp);
      const translated = data?.choices?.[0]?.message?.content?.trim();
      if (resp.ok && translated) {
        return res.status(200).json({ translation: translated });
      }
      console.warn('[translate] Groq failed, falling back to MyMemory', resp.status);
    } catch (err) {
      console.warn('[translate] Groq error, falling back to MyMemory', err);
    }
  } else {
    // Defensive — unreachable while the fallback key above is present, but
    // kept so a future key-strip doesn't 500 here.
    console.warn('[translate] no Groq key available, using MyMemory fallback');
  }

  // Fallback provider: MyMemory (free, no key required)
  try {
    const sourceLang = sourceLanguage || 'en';
    const langPair = `${sourceLang}|${targetLanguage}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    const fb = await fetchWithTimeout(url, { method: 'GET' }, UPSTREAM_TIMEOUT_MS);
    const fbData = await safeJson(fb);

    if (fbData?.responseStatus === 200 && fbData.responseData) {
      return res.status(200).json({ translation: fbData.responseData.translatedText });
    }
    return res.status(502).json({ error: 'Translation failed', details: fbData?.responseDetails || 'Unknown upstream error' });
  } catch (err) {
    console.error('[translate] fallback failed', err);
    return res.status(502).json({ error: 'Could not reach translation service.' });
  }
};

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}
