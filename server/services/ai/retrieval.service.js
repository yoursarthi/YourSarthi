'use strict';

const pgdb = require('../../pgdb');

const IN_MEMORY_STORE = new Map();

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

async function storeChunk(docId, courseId, chunkIndex, chunkText, embedding) {
  if (pgdb.ready) {
    const { rows } = await pgdb.pool.query(
      `INSERT INTO document_chunks (doc_id, course_id, chunk_index, chunk_text, embedding, token_count)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6) RETURNING id`,
      [docId, courseId, chunkIndex, chunkText, JSON.stringify(embedding), Math.round(chunkText.length / 4)]
    );
    return rows[0]?.id;
  }
  const id = `${docId}_${chunkIndex}`;
  const courseChunks = IN_MEMORY_STORE.get(courseId) || [];
  courseChunks.push({ id, chunkText, embedding, docId, chunkIndex });
  IN_MEMORY_STORE.set(courseId, courseChunks);
  return id;
}

async function storeChunks(docId, courseId, chunks, embeddings) {
  const ids = [];
  for (let i = 0; i < chunks.length; i++) {
    ids.push(await storeChunk(docId, courseId, i, chunks[i], embeddings[i]));
  }
  return ids;
}

async function similaritySearch(courseId, queryEmbedding, topK = 5, threshold = 0.4) {
  let rows;
  if (pgdb.ready) {
    const { rows: dbRows } = await pgdb.pool.query(
      `SELECT id, chunk_text, doc_id, chunk_index, embedding::text AS embedding_text
       FROM document_chunks WHERE course_id = $1 ORDER BY created_at`,
      [courseId]
    );
    rows = dbRows.map(r => ({
      id: r.id, chunkText: r.chunk_text, docId: r.doc_id,
      chunkIndex: r.chunk_index, embedding: JSON.parse(r.embedding_text || '[]'),
    }));
  } else {
    rows = (IN_MEMORY_STORE.get(courseId) || []).map(r => ({
      id: r.id, chunkText: r.chunkText, docId: r.docId,
      chunkIndex: r.chunkIndex, embedding: r.embedding,
    }));
  }

  if (!rows.length) return [];

  return rows
    .map(r => ({ ...r, score: cosineSimilarity(queryEmbedding, r.embedding) }))
    .filter(r => r.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ embedding, ...rest }) => rest);
}

async function deleteDocumentChunks(docId) {
  if (pgdb.ready) {
    await pgdb.pool.query('DELETE FROM document_chunks WHERE doc_id = $1', [docId]);
  }
  for (const [courseId, chunks] of IN_MEMORY_STORE.entries()) {
    IN_MEMORY_STORE.set(courseId, chunks.filter(c => c.docId !== docId));
  }
}

async function getCourseChunkCount(courseId) {
  if (pgdb.ready) {
    const { rows } = await pgdb.pool.query(
      'SELECT COUNT(*) FROM document_chunks WHERE course_id = $1', [courseId]
    );
    return parseInt(rows[0]?.count || 0);
  }
  return (IN_MEMORY_STORE.get(courseId) || []).length;
}

module.exports = { storeChunks, similaritySearch, deleteDocumentChunks, getCourseChunkCount, cosineSimilarity };
