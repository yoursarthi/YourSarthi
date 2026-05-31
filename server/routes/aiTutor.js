'use strict';

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const pgdb    = require('../pgdb');
const rag     = require('../services/ai/rag.service');
const store   = require('../services/ai/retrieval.service');
const gemini  = require('../services/ai/gemini.service');

// ─── Upload storage ───────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../uploads/ai-tutor');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const _upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    ['.pdf', '.docx', '.pptx', '.txt'].includes(ext)
      ? cb(null, true)
      : cb(new Error('Only PDF, DOCX, PPTX and TXT files are allowed'));
  },
});

function getUser(req) {
  return {
    id:   req.headers['x-user-id']   || 'anon',
    role: req.headers['x-user-role'] || 'student',
    name: req.headers['x-user-name'] || '',
  };
}

// In-memory fallbacks
const _sessions  = new Map();
const _messages  = new Map();

// ─── Health ───────────────────────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const geminiOk = await gemini.checkHealth().catch(() => false);
    res.json({ gemini: geminiOk, model: gemini.CHAT_MODEL, embedModel: gemini.EMBED_MODEL });
  } catch (e) {
    res.json({ gemini: false, error: e.message });
  }
});

// ─── Upload document ─────────────────────────────────────────────────────────
router.post('/upload/:courseId', (req, res, next) => {
  _upload.single('file')(req, res, err => err ? res.status(400).json({ error: err.message }) : next());
}, async (req, res) => {
  const user = getUser(req);
  const { courseId } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const fileType = path.extname(req.file.originalname).toLowerCase().slice(1);
  const docId    = uuidv4();

  try {
    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO course_documents (id, course_id, file_name, file_path, file_type, file_size, status, uploaded_by, uploader_name)
         VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7, $8)`,
        [docId, courseId, req.file.originalname, req.file.path, fileType, req.file.size, user.id, user.name]
      );
    }

    res.json({ id: docId, fileName: req.file.originalname, status: 'processing' });

    rag.processDocument(docId, req.file.path, fileType, courseId).catch(err => {
      console.error('[aiTutor] processDocument error:', err.message);
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Document processing status ───────────────────────────────────────────────
router.get('/documents/:docId/status', (req, res) => {
  res.json(rag.getProcessingStatus(req.params.docId));
});

// ─── List documents for a course ─────────────────────────────────────────────
router.get('/documents/:courseId', async (req, res) => {
  const { courseId } = req.params;
  if (pgdb.ready) {
    const { rows } = await pgdb.pool.query(
      `SELECT id, file_name, file_type, file_size, status, chunk_count, uploader_name, created_at
       FROM course_documents WHERE course_id = $1 ORDER BY created_at DESC`,
      [courseId]
    );
    return res.json(rows.map(r => ({
      id:           r.id,
      fileName:     r.file_name,
      fileType:     r.file_type,
      fileSize:     r.file_size,
      status:       r.status,
      chunkCount:   r.chunk_count,
      uploaderName: r.uploader_name,
      createdAt:    r.created_at,
    })));
  }
  res.json([]);
});

// ─── Delete document ─────────────────────────────────────────────────────────
router.delete('/documents/:docId', async (req, res) => {
  const { docId } = req.params;
  try {
    await store.deleteDocumentChunks(docId);
    if (pgdb.ready) {
      const { rows } = await pgdb.pool.query('SELECT file_path FROM course_documents WHERE id = $1', [docId]);
      if (rows[0]?.file_path) try { fs.unlinkSync(rows[0].file_path); } catch {}
      await pgdb.pool.query('DELETE FROM course_documents WHERE id = $1', [docId]);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Create chat session ──────────────────────────────────────────────────────
router.post('/sessions/:courseId', async (req, res) => {
  const user = getUser(req);
  const { courseId } = req.params;
  const title = req.body.title || 'New Chat';
  const sessionId = uuidv4();
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO ai_chat_sessions (id, course_id, user_id, user_name, title) VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, courseId, user.id, user.name, title]
      );
    } else {
      _sessions.set(sessionId, { id: sessionId, courseId, userId: user.id, title, createdAt: new Date().toISOString() });
      _messages.set(sessionId, []);
    }
    res.json({ id: sessionId, title });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── List sessions ────────────────────────────────────────────────────────────
router.get('/sessions/:courseId', async (req, res) => {
  const user = getUser(req);
  const { courseId } = req.params;
  if (pgdb.ready) {
    const { rows } = await pgdb.pool.query(
      `SELECT id, title, created_at, updated_at FROM ai_chat_sessions
       WHERE course_id = $1 AND user_id = $2 ORDER BY updated_at DESC LIMIT 20`,
      [courseId, user.id]
    );
    return res.json(rows);
  }
  res.json([..._sessions.values()].filter(s => s.courseId === courseId && s.userId === user.id));
});

// ─── Delete session ───────────────────────────────────────────────────────────
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    if (pgdb.ready) {
      await pgdb.pool.query('DELETE FROM ai_chat_sessions WHERE id = $1', [req.params.sessionId]);
    } else {
      _sessions.delete(req.params.sessionId);
      _messages.delete(req.params.sessionId);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Get messages ─────────────────────────────────────────────────────────────
router.get('/sessions/:sessionId/messages', async (req, res) => {
  const { sessionId } = req.params;
  if (pgdb.ready) {
    const { rows } = await pgdb.pool.query(
      `SELECT id, role, content, sources, created_at FROM ai_chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );
    return res.json(rows.map(r => ({
      id: r.id, role: r.role, content: r.content,
      sources: r.sources || [], createdAt: r.created_at,
    })));
  }
  res.json(_messages.get(sessionId) || []);
});

// ─── Chat — SSE streaming ─────────────────────────────────────────────────────
router.post('/chat/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { question, courseId } = req.body;
  if (!question?.trim() || !courseId) {
    return res.status(400).json({ error: 'question and courseId required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const send = (type, data) => res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);

  try {
    // Load history
    let history = [];
    if (pgdb.ready) {
      const { rows } = await pgdb.pool.query(
        `SELECT role, content FROM ai_chat_messages WHERE session_id = $1 ORDER BY created_at ASC LIMIT 20`,
        [sessionId]
      );
      history = rows;
    } else {
      history = (_messages.get(sessionId) || []).slice(-20);
    }

    // Save user message
    const userMsgId = uuidv4();
    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO ai_chat_messages (id, session_id, role, content) VALUES ($1, $2, 'user', $3)`,
        [userMsgId, sessionId, question]
      );
      // Auto-title on first message
      const { rows: cnt } = await pgdb.pool.query(
        `SELECT COUNT(*) FROM ai_chat_messages WHERE session_id = $1`, [sessionId]
      );
      if (parseInt(cnt[0].count) <= 1) {
        const title = question.slice(0, 60) + (question.length > 60 ? '…' : '');
        await pgdb.pool.query(
          `UPDATE ai_chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2`,
          [title, sessionId]
        );
      } else {
        await pgdb.pool.query(`UPDATE ai_chat_sessions SET updated_at = NOW() WHERE id = $1`, [sessionId]);
      }
    } else {
      const msgs = _messages.get(sessionId) || [];
      msgs.push({ role: 'user', content: question, id: userMsgId });
      _messages.set(sessionId, msgs);
    }

    send('user_saved', { id: userMsgId });

    // Stream Gemini answer
    let fullAnswer = '';
    const { sources, noContext } = await rag.streamAnswer(
      courseId, question, history,
      (chunk) => { fullAnswer += chunk; send('chunk', { text: chunk }); }
    );

    // Save assistant message
    const asstMsgId = uuidv4();
    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO ai_chat_messages (id, session_id, role, content, sources) VALUES ($1, $2, 'assistant', $3, $4)`,
        [asstMsgId, sessionId, fullAnswer.trim(), JSON.stringify(sources)]
      );
    } else {
      const msgs = _messages.get(sessionId) || [];
      msgs.push({ role: 'assistant', content: fullAnswer.trim(), sources, id: asstMsgId });
      _messages.set(sessionId, msgs);
    }

    send('done', { id: asstMsgId, sources, noContext });
    res.end();
  } catch (err) {
    send('error', { message: err.message || 'AI error' });
    res.end();
  }
});

// ─── Quiz generation ──────────────────────────────────────────────────────────
router.post('/quiz/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const { topic = '', count = 5 } = req.body;
  try {
    const quiz = await rag.generateQuiz(courseId, topic, Math.min(Number(count) || 5, 10));
    res.json({ quiz });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Flashcard generation ─────────────────────────────────────────────────────
router.post('/flashcards/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const { topic = '', count = 8 } = req.body;
  try {
    const flashcards = await rag.generateFlashcards(courseId, topic, Math.min(Number(count) || 8, 20));
    res.json({ flashcards });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Viva questions ───────────────────────────────────────────────────────────
router.post('/viva/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const { topic = '', count = 5 } = req.body;
  try {
    const questions = await rag.generateVivaQuestions(courseId, topic, Math.min(Number(count) || 5, 10));
    res.json({ questions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Study notes / summary ────────────────────────────────────────────────────
router.post('/summary/:courseId', async (req, res) => {
  const { courseId } = req.params;
  const { topic = '' } = req.body;
  if (!topic.trim()) return res.status(400).json({ error: 'topic is required' });
  try {
    const summary = await rag.generateSummary(courseId, topic);
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
