'use strict';

/**
 * Embeddings via Gemini text-embedding-004.
 * 768-dimensional vectors, suitable for semantic retrieval.
 */

const gemini = require('./gemini.service');

const embed      = (text)              => gemini.embed(text);
const embedBatch = (texts, onProgress) => gemini.embedBatch(texts, onProgress);
const EMBED_MODEL = gemini.EMBED_MODEL;

module.exports = { embed, embedBatch, EMBED_MODEL };
