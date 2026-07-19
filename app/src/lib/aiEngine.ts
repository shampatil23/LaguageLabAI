// Client-side service for the AI Learning Engine.
// All AI calls go through the backend (/api/ai) — no keys in the browser.

import { auth } from './firebase';

export interface AgentResponse {
  ok: boolean;
  text?: string;
  json?: any;
  provider?: string;
  error?: string;
}

/**
 * Call a backend AI agent. Retries once on network failure.
 * Never throws — always resolves with { ok, ... }.
 */
export async function callAgent(agent: string, payload: any = {}): Promise<AgentResponse> {
  const uid = auth.currentUser?.uid;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent, payload, uid }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) return data;
      if (res.status === 429 || res.status === 400) {
        return { ok: false, error: data?.error || 'Request rejected' };
      }
      // 5xx — allow one retry
      if (attempt === 0) { await new Promise(r => setTimeout(r, 1500)); continue; }
      return { ok: false, error: data?.error || 'AI service unavailable' };
    } catch {
      if (attempt === 0) { await new Promise(r => setTimeout(r, 1500)); continue; }
      return { ok: false, error: 'No internet connection. Please check your network and try again.' };
    }
  }
  return { ok: false, error: 'AI service unavailable' };
}

// ── Minimal markdown → HTML renderer (headings, bold, lists, tables, quotes) ──

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-indigo-700 px-1 rounded text-[0.9em]">$1</code>');
}

export function mdToHtml(md: string): string {
  const lines = (md || '').split('\n');
  const out: string[] = [];
  let i = 0;
  let listOpen: 'ul' | 'ol' | null = null;
  const closeList = () => { if (listOpen) { out.push(`</${listOpen}>`); listOpen = null; } };

  while (i < lines.length) {
    const raw = lines[i];
    const line = esc(raw);

    // code fence
    if (/^```/.test(raw)) {
      closeList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) { buf.push(esc(lines[i])); i++; }
      i++;
      out.push(`<pre class="bg-slate-900 text-slate-100 rounded-xl p-3 text-xs overflow-x-auto my-2">${buf.join('\n')}</pre>`);
      continue;
    }
    // table
    if (/^\s*\|/.test(raw) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      closeList();
      const header = raw.split('|').slice(1, -1).map(c => inline(esc(c.trim())));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(lines[i].split('|').slice(1, -1).map(c => inline(esc(c.trim()))));
        i++;
      }
      out.push('<div class="overflow-x-auto my-2"><table class="w-full text-xs border border-slate-200 rounded-lg">');
      out.push(`<thead><tr>${header.map(h => `<th class="border border-slate-200 bg-indigo-50 text-indigo-800 px-2 py-1.5 text-left font-bold">${h}</th>`).join('')}</tr></thead>`);
      out.push(`<tbody>${rows.map(r => `<tr>${r.map(c => `<td class="border border-slate-200 px-2 py-1.5">${c}</td>`).join('')}</tr>`).join('')}</tbody>`);
      out.push('</table></div>');
      continue;
    }
    // headings
    const h = raw.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      closeList();
      const level = h[1].length;
      const cls = level <= 2
        ? 'text-base font-black text-slate-900 mt-4 mb-1.5'
        : 'text-sm font-bold text-slate-800 mt-3 mb-1';
      out.push(`<h${level} class="${cls}">${inline(esc(h[2]))}</h${level}>`);
      i++; continue;
    }
    // blockquote
    if (/^>\s?/.test(raw)) {
      closeList();
      out.push(`<blockquote class="border-l-4 border-amber-400 bg-amber-50 text-amber-900 px-3 py-2 rounded-r-lg text-xs my-2">${inline(esc(raw.replace(/^>\s?/, '')))}</blockquote>`);
      i++; continue;
    }
    // lists
    const ul = raw.match(/^\s*[-*]\s+(.*)/);
    const ol = raw.match(/^\s*\d+[.)]\s+(.*)/);
    if (ul || ol) {
      const kind = ul ? 'ul' : 'ol';
      if (listOpen !== kind) {
        closeList();
        out.push(kind === 'ul'
          ? '<ul class="list-disc pl-5 space-y-1 text-xs my-1.5">'
          : '<ol class="list-decimal pl-5 space-y-1 text-xs my-1.5">');
        listOpen = kind;
      }
      out.push(`<li>${inline(esc((ul || ol)![1]))}</li>`);
      i++; continue;
    }
    // hr
    if (/^\s*---+\s*$/.test(raw)) { closeList(); out.push('<hr class="my-3 border-slate-200"/>'); i++; continue; }
    // blank
    if (raw.trim() === '') { closeList(); i++; continue; }
    // paragraph
    closeList();
    out.push(`<p class="text-xs text-slate-700 leading-relaxed my-1.5">${inline(line)}</p>`);
    i++;
  }
  closeList();
  return out.join('\n');
}
