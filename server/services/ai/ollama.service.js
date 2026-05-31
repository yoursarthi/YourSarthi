'use strict';

const config = require('../../config');

const OLLAMA_BASE = process.env.OLLAMA_URL || config.ollama.host;
const CHAT_MODEL  = process.env.OLLAMA_MODEL       || config.ollama.model;
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const TIMEOUT_MS  = 120_000;

async function checkHealth() {
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(5000) });
    return r.ok;
  } catch { return false; }
}

async function listModels() {
  const r = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) throw new Error('Ollama not available');
  const d = await r.json();
  return (d.models || []).map(m => m.name);
}

async function generate(prompt, options = {}) {
  const body = {
    model: options.model || CHAT_MODEL,
    prompt,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.1,
      num_ctx:     options.num_ctx ?? 4096,
      top_p:       options.top_p ?? 0.9,
      stop:        options.stop || [],
    },
  };
  const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`Ollama generate failed: ${await r.text()}`);
  const d = await r.json();
  return d.response || '';
}

async function generateStream(prompt, options = {}, onChunk) {
  const body = {
    model: options.model || CHAT_MODEL,
    prompt,
    stream: true,
    options: {
      temperature: options.temperature ?? 0.15,
      num_ctx:     options.num_ctx ?? 4096,
      top_p:       options.top_p ?? 0.9,
    },
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: controller.signal,
    });
    if (!r.ok) throw new Error(`Ollama stream failed: ${r.statusText}`);

    const reader  = r.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
        try {
          const data = JSON.parse(line);
          if (data.response) { full += data.response; onChunk?.(data.response); }
          if (data.done) return full;
        } catch {}
      }
    }
    return full;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { checkHealth, listModels, generate, generateStream, CHAT_MODEL, EMBED_MODEL };
