'use strict';

/**
 * RAG orchestrator.
 * Document processing + retrieval uses local pgvector.
 * Final generation uses Gemini API.
 */

const gemini     = require('./gemini.service');
const { extractText, chunkText } = require('./chunking.service');
const { storeChunks, similaritySearch } = require('./retrieval.service');
const {
  buildRAGPrompt,
  buildQuizPrompt,
  buildFlashcardPrompt,
  buildVivaPrompt,
  buildSummaryPrompt,
} = require('./prompt.service');
const pgdb = require('../../pgdb');
const { createLogger } = require('../../utils/logger');

const log = createLogger('rag');

// In-memory processing status
const _processingStatus = new Map();

// ─── Document ingestion ───────────────────────────────────────────────────────

async function processDocument(docId, filePath, fileType, courseId) {
  _processingStatus.set(docId, { status: 'extracting', progress: 0, error: null });
  try {
    // 1. Extract text
    const rawText = await extractText(filePath, fileType);
    if (!rawText || rawText.trim().length < 50) {
      throw new Error('No extractable text found in document');
    }
    _processingStatus.set(docId, { status: 'chunking', progress: 10, error: null });

    // 2. Chunk
    const chunks = chunkText(rawText);
    if (!chunks.length) throw new Error('No valid chunks produced');
    _processingStatus.set(docId, { status: 'embedding', progress: 20, error: null });

    // 3. Embed via Gemini (sequential with progress)
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      embeddings.push(await gemini.embed(chunks[i]));
      const pct = 20 + Math.round(((i + 1) / chunks.length) * 70);
      _processingStatus.set(docId, { status: 'embedding', progress: pct, error: null });
    }

    // 4. Store in pgvector / in-memory
    await storeChunks(docId, courseId, chunks, embeddings);
    _processingStatus.set(docId, { status: 'ready', progress: 100, error: null });

    if (pgdb.ready) {
      await pgdb.pool.query(
        `UPDATE course_documents SET status = 'ready', chunk_count = $1, updated_at = NOW() WHERE id = $2`,
        [chunks.length, docId]
      );
    }

    log.info(`Document ${docId} processed: ${chunks.length} chunks`);
    return { chunks: chunks.length };
  } catch (err) {
    const msg = err.message || 'Processing failed';
    _processingStatus.set(docId, { status: 'failed', progress: 0, error: msg });
    if (pgdb.ready) {
      await pgdb.pool.query(
        `UPDATE course_documents SET status = 'failed', updated_at = NOW() WHERE id = $1`, [docId]
      );
    }
    log.error(`Document ${docId} processing failed:`, msg);
    throw err;
  }
}

function getProcessingStatus(docId) {
  return _processingStatus.get(docId) || { status: 'unknown', progress: 0, error: null };
}

// ─── Retrieval helpers ────────────────────────────────────────────────────────

const NO_CONTEXT_MSG = 'This topic is not covered in the uploaded course material.';
const TOP_K          = 5;
const THRESHOLD      = 0.35;

async function _retrieve(courseId, question) {
  const queryEmbedding = await gemini.embed(question);
  return similaritySearch(courseId, queryEmbedding, TOP_K, THRESHOLD);
}

function _noContext() {
  return { answer: NO_CONTEXT_MSG, sources: [], noContext: true };
}

// ─── Chat (streaming) ─────────────────────────────────────────────────────────

async function streamAnswer(courseId, question, sessionHistory = [], onChunk) {
  const chunks = await _retrieve(courseId, question);
  if (!chunks.length) {
    onChunk(NO_CONTEXT_MSG);
    return _noContext();
  }

  const { systemInstruction, prompt } = buildRAGPrompt(chunks, question, sessionHistory);

  let full = '';
  await gemini.streamContent(
    [{ role: 'user', content: prompt }],
    { systemInstruction, temperature: 0.1 },
    (delta) => { full += delta; onChunk(delta); }
  );

  return {
    answer:   full.trim(),
    sources:  chunks.map(c => ({ id: c.id, excerpt: c.chunkText.slice(0, 150) + '…', score: c.score })),
    noContext: false,
  };
}

// ─── Quiz generation ──────────────────────────────────────────────────────────

async function generateQuiz(courseId, topic, count = 5) {
  const qEmbed = await gemini.embed(topic || 'key concepts');
  const chunks  = await similaritySearch(courseId, qEmbed, 8, 0.3);
  if (!chunks.length) return [];

  const context = chunks.map(c => c.chunkText).join('\n\n');
  const prompt  = buildQuizPrompt(context, topic, count);

  const raw = await gemini.generateContent(prompt, { temperature: 0.2 });
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    log.warn('Quiz JSON parse failed, raw:', raw.slice(0, 200));
    return [];
  }
}

// ─── Flashcard generation ─────────────────────────────────────────────────────

async function generateFlashcards(courseId, topic, count = 8) {
  const qEmbed = await gemini.embed(topic || 'key terms');
  const chunks  = await similaritySearch(courseId, qEmbed, 6, 0.3);
  if (!chunks.length) return [];

  const context = chunks.map(c => c.chunkText).join('\n\n');
  const prompt  = buildFlashcardPrompt(context, topic, count);

  const raw = await gemini.generateContent(prompt, { temperature: 0.2 });
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    log.warn('Flashcard JSON parse failed');
    return [];
  }
}

// ─── Viva questions ───────────────────────────────────────────────────────────

async function generateVivaQuestions(courseId, topic, count = 5) {
  const qEmbed = await gemini.embed(topic || 'concepts');
  const chunks  = await similaritySearch(courseId, qEmbed, 8, 0.3);
  if (!chunks.length) return [];

  const context = chunks.map(c => c.chunkText).join('\n\n');
  const prompt  = buildVivaPrompt(context, topic, count);

  const raw = await gemini.generateContent(prompt, { temperature: 0.2 });
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
}

// ─── Study notes / summary ────────────────────────────────────────────────────

async function generateSummary(courseId, topic) {
  const qEmbed = await gemini.embed(topic || 'overview');
  const chunks  = await similaritySearch(courseId, qEmbed, 10, 0.25);
  if (!chunks.length) return NO_CONTEXT_MSG;

  const context = chunks.map(c => c.chunkText).join('\n\n');
  const prompt  = buildSummaryPrompt(context, topic);

  return gemini.generateContent(prompt, { temperature: 0.1, maxOutputTokens: 4096 });
}

module.exports = {
  processDocument,
  getProcessingStatus,
  streamAnswer,
  generateQuiz,
  generateFlashcards,
  generateVivaQuestions,
  generateSummary,
};
