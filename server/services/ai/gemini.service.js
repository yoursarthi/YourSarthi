'use strict';

/**
 * Centralized Gemini API wrapper.
 * Handles generation, streaming, embeddings, retry, and rate-limit back-off.
 */

const { createLogger } = require('../../utils/logger');

const log = createLogger('gemini');

const BASE_URL    = 'https://generativelanguage.googleapis.com/v1beta';
const CHAT_MODEL  = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const EMBED_MODEL = 'gemini-embedding-001';

const MAX_RETRIES  = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // ms

function getKey() {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  return key;
}

async function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Run fn with exponential back-off on 429 / 5xx.
 */
async function _withRetry(fn) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable = err.status === 429 || err.status >= 500;
      if (!isRetryable || attempt === MAX_RETRIES - 1) break;
      const delay = RETRY_DELAYS[attempt] ?? 4000;
      log.warn(`Attempt ${attempt + 1} failed (${err.message}) — retrying in ${delay}ms`);
      await _sleep(delay);
    }
  }
  throw lastErr;
}

function _apiErr(status, body) {
  const msg = body?.error?.message || `HTTP ${status}`;
  const err = new Error(`Gemini API: ${msg}`);
  err.status = status;
  return err;
}

/**
 * Generate a text response (non-streaming).
 * @param {string|Array} prompt  - string or array of {role, content} messages
 * @param {object} opts
 * @param {number} [opts.temperature=0.1]
 * @param {number} [opts.maxOutputTokens=8192]
 * @param {string} [opts.model]
 */
async function generateContent(prompt, opts = {}) {
  return _withRetry(async () => {
    const key   = getKey();
    const model = opts.model || CHAT_MODEL();

    const contents = Array.isArray(prompt)
      ? prompt.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      : [{ role: 'user', parts: [{ text: prompt }] }];

    const body = {
      contents,
      generationConfig: {
        temperature:      opts.temperature      ?? 0.1,
        maxOutputTokens:  opts.maxOutputTokens  ?? 8192,
        topP:             opts.topP             ?? 0.95,
      },
    };

    if (opts.systemInstruction) {
      body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
    }

    const url = `${BASE_URL}/models/${model}:generateContent?key=${key}`;
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(60_000),
    });

    const data = await res.json();
    if (!res.ok) throw _apiErr(res.status, data);

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim();
  });
}

/**
 * Stream a text response via Gemini SSE.
 * Calls onChunk(delta) for each incremental piece of text.
 * Returns the full accumulated response string.
 */
async function streamContent(prompt, opts = {}, onChunk) {
  const key   = getKey();
  const model = opts.model || CHAT_MODEL();

  const contents = Array.isArray(prompt)
    ? prompt.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    : [{ role: 'user', parts: [{ text: prompt }] }];

  const body = {
    contents,
    generationConfig: {
      temperature:     opts.temperature     ?? 0.1,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      topP:            opts.topP            ?? 0.95,
    },
  };

  if (opts.systemInstruction) {
    body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
  }

  const url = `${BASE_URL}/models/${model}:streamGenerateContent?alt=sse&key=${key}`;

  let res;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(90_000),
    });
    if (res.ok) break;
    if (res.status === 429 || res.status >= 500) {
      const delay = RETRY_DELAYS[attempt] ?? 4000;
      log.warn(`Stream attempt ${attempt + 1} failed (${res.status}) — retrying in ${delay}ms`);
      await _sleep(delay);
      continue;
    }
    const errData = await res.json().catch(() => ({}));
    throw _apiErr(res.status, errData);
  }

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw _apiErr(res.status, errData);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let full   = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === '[DONE]') continue;
      try {
        const json = JSON.parse(raw);
        const delta = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (delta) {
          full += delta;
          onChunk?.(delta);
        }
      } catch {}
    }
  }

  return full;
}

/**
 * Embed a single text string.
 * Returns a float[] (768 dimensions for text-embedding-004).
 */
async function embed(text) {
  return _withRetry(async () => {
    const key = getKey();
    const url = `${BASE_URL}/models/${EMBED_MODEL}:embedContent?key=${key}`;
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        model:   `models/${EMBED_MODEL}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
      signal:  AbortSignal.timeout(30_000),
    });
    const data = await res.json();
    if (!res.ok) throw _apiErr(res.status, data);
    return data.embedding?.values || [];
  });
}

/**
 * Embed multiple texts sequentially (Gemini free tier has no batch endpoint).
 * Small delay between calls to stay within rate limits.
 */
async function embedBatch(texts, onProgress) {
  const results = [];
  for (let i = 0; i < texts.length; i++) {
    results.push(await embed(texts[i]));
    onProgress?.(i + 1, texts.length);
    if (i < texts.length - 1) await _sleep(100); // ~10 embeds/sec safe rate
  }
  return results;
}

/**
 * Quick reachability check — returns true if API key is set and Gemini responds.
 */
async function checkHealth() {
  try {
    if (!process.env.GEMINI_API_KEY) return false;
    // Tiny embed to verify connectivity + key validity
    await embed('health check');
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  generateContent,
  streamContent,
  embed,
  embedBatch,
  checkHealth,
  CHAT_MODEL: CHAT_MODEL(),
  EMBED_MODEL,
};
