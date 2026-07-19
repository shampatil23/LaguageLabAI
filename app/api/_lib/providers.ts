// ─────────────────────────────────────────────────────────────────────────────
// Multi-provider AI layer
// Chain: Groq → OpenRouter → NVIDIA (each tried in order, skipping any provider
// whose key is not configured).
// - API keys are read ONLY from server-side environment variables. No hardcoded
//   fallback keys — committed keys get revoked by providers and mask config errors.
// - Exponential backoff per provider, automatic provider switching.
// - Response validation + JSON extraction/repair for structured outputs.
// - Never throws raw provider errors to callers; returns graceful failures.
// ─────────────────────────────────────────────────────────────────────────────

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface GenerateOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** When true, the model is instructed to return strict JSON and the result is parsed. */
  json?: boolean;
  /** Optional validator for parsed JSON. Return true if the payload is usable. */
  validate?: (parsed: any) => boolean;
  /** Overall timeout per provider attempt (ms). */
  timeoutMs?: number;
}

export interface GenerateResult {
  ok: boolean;
  text?: string;
  json?: any;
  provider?: string;
  error?: string;
}

interface ProviderConfig {
  name: string;
  url: string;
  model: string;
  apiKeyEnv: string;
  extraHeaders?: Record<string, string>;
}

// Per-provider timeout overrides (ms). Keeps fast providers snappy and
// lets slow/unreliable providers fail-fast so the fallback chain kicks in.
const PROVIDER_TIMEOUTS: Record<string, number> = {
  nvidia: 15000,      // NVIDIA can be slow — fail-fast so OpenRouter takes over
  openrouter: 45000,  // OpenRouter is reliable and fast
  groq: 45000,        // Groq is reliable and fast
};

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
  },
  {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    extraHeaders: {
      'HTTP-Referer': 'https://languagelab.app',
      'X-Title': 'LanguageLab AI Learning Engine',
    },
  },
  {
    name: 'nvidia',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'meta/llama-3.3-70b-instruct',
    apiKeyEnv: 'NVIDIA_API_KEY',
  },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function log(level: 'info' | 'warn' | 'error', event: string, detail?: any) {
  const line = `[ai-engine] ${level.toUpperCase()} ${event}`;
  if (level === 'error') console.error(line, detail ?? '');
  else if (level === 'warn') console.warn(line, detail ?? '');
  else console.log(line, detail ?? '');
}

/** Extract the first JSON object/array from model output (handles ```json fences, prose). */
export function extractJson(text: string): any | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenced?.[1], text];
  for (const c of candidates) {
    if (!c) continue;
    const start = c.search(/[[{]/);
    if (start === -1) continue;
    // Walk to find a balanced close
    const open = c[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < c.length; i++) {
      const ch = c[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') inStr = !inStr;
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(c.slice(start, i + 1)); } catch { break; }
        }
      }
    }
  }
  return null;
}

async function callProvider(
  p: ProviderConfig,
  opts: GenerateOptions,
): Promise<{ ok: boolean; text?: string; status?: number; error?: string; retryable?: boolean }> {
  const apiKey = process.env[p.apiKeyEnv];
  if (!apiKey) return { ok: false, error: `${p.apiKeyEnv} not configured`, retryable: false };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    PROVIDER_TIMEOUTS[p.name] ?? opts.timeoutMs ?? 60000,
  );
  try {
    const res = await fetch(p.url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(p.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: p.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 4096,
      }),
    });
    const data: any = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      // 429/5xx are retryable; 401/403/400 are not worth retrying on same provider
      const retryable = res.status === 429 || res.status >= 500;
      return { ok: false, status: res.status, error: msg, retryable };
    }
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { ok: false, error: 'Empty completion', retryable: true };
    }
    return { ok: true, text };
  } catch (e: any) {
    const aborted = e?.name === 'AbortError';
    return { ok: false, error: aborted ? 'Request timed out' : String(e?.message || e), retryable: true };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate a completion using the provider chain.
 * Tries each provider (with per-provider exponential backoff), then a second
 * pass over all providers with longer backoff before giving up.
 */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const messages = [...opts.messages];
  if (opts.json) {
    messages.push({
      role: 'system',
      content:
        'Respond with ONLY valid JSON. No prose before or after. No markdown fences. Follow the requested schema exactly.',
    });
  }
  const effective = { ...opts, messages };

  const passes = 2;
  for (let pass = 0; pass < passes; pass++) {
    for (const p of PROVIDERS) {
      const attempts = pass === 0 ? 2 : 1;
      for (let attempt = 0; attempt < attempts; attempt++) {
        const backoff = Math.min(8000, 500 * Math.pow(2, pass * 2 + attempt));
        if (pass > 0 || attempt > 0) await sleep(backoff);

        const r = await callProvider(p, effective);
        if (!r.ok) {
          log('warn', `provider ${p.name} failed (pass ${pass + 1}, attempt ${attempt + 1})`, r.error);
          if (!r.retryable) break; // skip to next provider
          continue;
        }

        if (!opts.json) return { ok: true, text: r.text, provider: p.name };

        const parsed = extractJson(r.text!);
        const valid = parsed !== null && (!opts.validate || safeValidate(opts.validate, parsed));
        if (valid) return { ok: true, text: r.text, json: parsed, provider: p.name };

        log('warn', `provider ${p.name} returned invalid/malformed JSON — regenerating`);
        // regeneration counts as another attempt on the same provider
        continue;
      }
    }
  }

  log('error', 'all providers failed');
  return {
    ok: false,
    error:
      'Our AI tutors are temporarily unavailable. Please try again in a moment — your progress has been saved.',
  };
}

function safeValidate(fn: (p: any) => boolean, parsed: any): boolean {
  try { return fn(parsed); } catch { return false; }
}
