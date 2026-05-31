const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pgdb = require('../pgdb');
const router = express.Router();

function auth(req) {
  return {
    id:   req.headers['x-user-id']   || 'unknown',
    role: req.headers['x-user-role'] || 'student',
    name: req.headers['x-user-name'] || 'Anonymous',
  };
}

const VALID_SUBMISSION_TYPES = [
  'feedback', 'complaint', 'suggestion',
  'faculty_review', 'course_feedback',
  'hostel_complaint', 'academic_issue', 'examination_issue',
];
const VALID_TARGET_TYPES = [
  'public', 'faculty', 'coe', 'dsw', 'df', 'hostel_warden', 'proctor', 'course',
];
const VALID_STATUSES = ['pending', 'under_review', 'resolved', 'rejected'];
const VALID_VISIBILITY = ['public', 'anonymous_public', 'private'];

// ─── In-memory fallback ────────────────────────────────────────────────────────
let _feedbacks = [];
let _replies   = [];
let _logs      = [];

function genId() { return uuidv4(); }

function sanitizeAuthorForVisibility(fb, requestUser) {
  if (fb.visibility === 'anonymous_public' && requestUser.role !== 'admin') {
    return { ...fb, authorName: 'Anonymous', authorId: null, anonAuthorId: null, anonAuthorName: null };
  }
  if (fb.visibility === 'private') {
    if (requestUser.role !== 'admin' && requestUser.id !== fb.authorId) {
      return null; // not visible
    }
    if (requestUser.role !== 'admin') {
      return { ...fb, anonAuthorId: null, anonAuthorName: null };
    }
  }
  return fb;
}

function mapFeedback(row, requestUser = { role: 'student', id: '' }) {
  const fb = {
    id:             row.id,
    authorId:       row.author_id,
    authorName:     row.author_name,
    authorRole:     row.author_role,
    type:           row.submission_type || row.type || 'feedback',
    submissionType: row.submission_type || row.type || 'feedback',
    targetType:     row.target_type || 'public',
    targetId:       row.target_id   || null,
    targetName:     row.target_name || '',
    title:          row.title,
    content:        row.content,
    status:         row.status,
    visibility:     row.visibility || 'public',
    isPublic:       row.is_public !== false,
    replyCount:     parseInt(row.reply_count || 0),
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
    // Admin only fields
    anonAuthorId:   requestUser.role === 'admin' ? (row.anon_author_id || null) : null,
    anonAuthorName: requestUser.role === 'admin' ? (row.anon_author_name || '') : null,
  };
  return sanitizeAuthorForVisibility(fb, requestUser);
}

function mapReply(row) {
  return {
    id:         row.id,
    feedbackId: row.feedback_id,
    authorId:   row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role,
    content:    row.content,
    createdAt:  row.created_at,
  };
}

function mapLog(row) {
  return {
    id:          row.id,
    feedbackId:  row.feedback_id,
    changedBy:   row.changed_by,
    changerName: row.changer_name,
    changerRole: row.changer_role,
    oldStatus:   row.old_status,
    newStatus:   row.new_status,
    note:        row.note,
    createdAt:   row.created_at,
  };
}

// ─── GET all feedback ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const user = auth(req);
  const { type, status, targetType, visibility } = req.query;
  try {
    if (pgdb.ready) {
      const conditions = [];
      const params = [];

      if (type)       { params.push(type);       conditions.push(`(f.submission_type = $${params.length} OR f.type = $${params.length})`); }
      if (status)     { params.push(status);     conditions.push(`f.status = $${params.length}`); }
      if (targetType) { params.push(targetType); conditions.push(`f.target_type = $${params.length}`); }
      if (visibility) { params.push(visibility); conditions.push(`f.visibility = $${params.length}`); }

      // Visibility RBAC
      if (user.role !== 'admin') {
        params.push(user.id);
        conditions.push(`(f.visibility IN ('public','anonymous_public') OR f.author_id = $${params.length})`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const r = await pgdb.pool.query(
        `SELECT f.*, COUNT(fr.id) AS reply_count
         FROM feedback f
         LEFT JOIN feedback_replies fr ON fr.feedback_id = f.id
         ${where}
         GROUP BY f.id
         ORDER BY f.created_at DESC`,
        params
      );
      const rows = r.rows.map(row => mapFeedback(row, user)).filter(Boolean);
      return res.json(rows);
    }

    // In-memory fallback
    let list = _feedbacks.map(f => ({
      ...f,
      replyCount: _replies.filter(r => r.feedbackId === f.id).length,
    }));
    if (type)       list = list.filter(f => (f.submissionType || f.type) === type);
    if (status)     list = list.filter(f => f.status === status);
    if (targetType) list = list.filter(f => f.targetType === targetType);

    // Visibility filter
    if (user.role !== 'admin') {
      list = list.filter(f => f.visibility === 'public' || f.visibility === 'anonymous_public' || f.authorId === user.id);
    }

    list = list.slice().reverse().map(f => sanitizeAuthorForVisibility(f, user)).filter(Boolean);
    res.json(list);
  } catch (err) {
    console.error('[feedback] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// ─── POST create feedback ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const user = auth(req);
  const {
    submissionType, type,
    targetType = 'public', targetId = null, targetName = '',
    title, content,
    visibility = 'public',
  } = req.body;

  if (!title || !content) return res.status(400).json({ error: 'title and content are required' });

  const fbType = VALID_SUBMISSION_TYPES.includes(submissionType || type) ? (submissionType || type) : 'feedback';
  const tType  = VALID_TARGET_TYPES.includes(targetType) ? targetType : 'public';
  const vis    = VALID_VISIBILITY.includes(visibility) ? visibility : 'public';

  // For anonymous submissions, store real identity separately
  const authorName = vis === 'anonymous_public' ? 'Anonymous' : user.name;
  const anonId     = vis === 'anonymous_public' ? user.id   : null;
  const anonName   = vis === 'anonymous_public' ? user.name : null;

  try {
    if (pgdb.ready) {
      const id = genId();
      // legacyType: map new types to one of the 3 legacy values (CHECK constraint may still exist on older DBs)
      const legacyType = ['feedback','complaint','suggestion'].includes(fbType) ? fbType : 'feedback';
      await pgdb.pool.query(
        `INSERT INTO feedback
           (id, author_id, author_name, author_role,
            submission_type, type,
            target_type, target_id, target_name,
            title, content, visibility,
            anon_author_id, anon_author_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, user.id, authorName, user.role,
         fbType, legacyType,
         tType, targetId, targetName,
         title, content, vis,
         anonId, anonName]
      );
      const r = await pgdb.pool.query(
        `SELECT f.*, 0 AS reply_count FROM feedback f WHERE f.id = $1`, [id]
      );
      return res.status(201).json(mapFeedback(r.rows[0], user));
    }

    const fb = {
      id: genId(), authorId: user.id, authorName, authorRole: user.role,
      submissionType: fbType, type: fbType,
      targetType: tType, targetId, targetName,
      title, content, visibility: vis,
      status: 'pending',
      isPublic: vis !== 'private',
      anonAuthorId: anonId, anonAuthorName: anonName,
      replyCount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    _feedbacks.push(fb);
    res.status(201).json(sanitizeAuthorForVisibility(fb, user));
  } catch (err) {
    console.error('[feedback] POST error:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// ─── PATCH update status (admin only) ─────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  const user = auth(req);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const { status, note = '' } = req.body;
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    if (pgdb.ready) {
      // Get old status for log
      const existing = await pgdb.pool.query('SELECT status FROM feedback WHERE id = $1', [req.params.id]);
      if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });
      const oldStatus = existing.rows[0].status;

      await pgdb.pool.query(
        `UPDATE feedback SET status = $1, updated_at = NOW() WHERE id = $2`,
        [status, req.params.id]
      );

      // Log the change
      await pgdb.pool.query(
        `INSERT INTO feedback_status_logs (id, feedback_id, changed_by, changer_name, changer_role, old_status, new_status, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [genId(), req.params.id, user.id, user.name, user.role, oldStatus, status, note]
      );

      return res.json({ ok: true, status });
    }

    const idx = _feedbacks.findIndex(f => f.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const oldStatus = _feedbacks[idx].status;
    _feedbacks[idx].status = status;
    _feedbacks[idx].updatedAt = new Date().toISOString();
    _logs.push({ id: genId(), feedbackId: req.params.id, changedBy: user.id, changerName: user.name, changerRole: user.role, oldStatus, newStatus: status, note, createdAt: new Date().toISOString() });
    res.json({ ok: true, status });
  } catch (err) {
    console.error('[feedback] PATCH status error:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// ─── DELETE feedback (admin or own) ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const user = auth(req);
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query('SELECT author_id FROM feedback WHERE id = $1', [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
      if (user.role !== 'admin' && r.rows[0].author_id !== user.id)
        return res.status(403).json({ error: 'Not authorized' });
      await pgdb.pool.query('DELETE FROM feedback WHERE id = $1', [req.params.id]);
      return res.json({ ok: true });
    }
    const idx = _feedbacks.findIndex(f => f.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    if (user.role !== 'admin' && _feedbacks[idx].authorId !== user.id)
      return res.status(403).json({ error: 'Not authorized' });
    _feedbacks.splice(idx, 1);
    _replies = _replies.filter(r => r.feedbackId !== req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[feedback] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// ─── GET replies ───────────────────────────────────────────────────────────────
router.get('/:id/replies', async (req, res) => {
  const user = auth(req);
  try {
    if (pgdb.ready) {
      // Check visibility access first
      const fb = await pgdb.pool.query('SELECT author_id, visibility FROM feedback WHERE id = $1', [req.params.id]);
      if (!fb.rows.length) return res.status(404).json({ error: 'Not found' });
      const { author_id, visibility } = fb.rows[0];
      if (visibility === 'private' && user.role !== 'admin' && author_id !== user.id)
        return res.status(403).json({ error: 'Not authorized' });

      const r = await pgdb.pool.query(
        `SELECT * FROM feedback_replies WHERE feedback_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );
      return res.json(r.rows.map(mapReply));
    }
    res.json(_replies.filter(r => r.feedbackId === req.params.id));
  } catch (err) {
    console.error('[feedback] GET replies error:', err.message);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// ─── POST add reply ────────────────────────────────────────────────────────────
router.post('/:id/replies', async (req, res) => {
  const { content } = req.body;
  const user = auth(req);
  if (!content) return res.status(400).json({ error: 'content required' });

  try {
    if (pgdb.ready) {
      // Check visibility access
      const fb = await pgdb.pool.query('SELECT author_id, visibility FROM feedback WHERE id = $1', [req.params.id]);
      if (!fb.rows.length) return res.status(404).json({ error: 'Not found' });
      const { author_id, visibility } = fb.rows[0];
      if (visibility === 'private' && user.role !== 'admin' && author_id !== user.id)
        return res.status(403).json({ error: 'Not authorized' });

      const id = genId();
      await pgdb.pool.query(
        `INSERT INTO feedback_replies (id, feedback_id, author_id, author_name, author_role, content)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, req.params.id, user.id, user.name, user.role, content]
      );
      await pgdb.pool.query(`UPDATE feedback SET updated_at = NOW() WHERE id = $1`, [req.params.id]);
      const r = await pgdb.pool.query('SELECT * FROM feedback_replies WHERE id = $1', [id]);
      return res.status(201).json(mapReply(r.rows[0]));
    }
    const reply = {
      id: genId(), feedbackId: req.params.id,
      authorId: user.id, authorName: user.name, authorRole: user.role,
      content, createdAt: new Date().toISOString(),
    };
    _replies.push(reply);
    res.status(201).json(reply);
  } catch (err) {
    console.error('[feedback] POST reply error:', err.message);
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

// ─── GET status log for a submission (admin only) ──────────────────────────────
router.get('/:id/log', async (req, res) => {
  const user = auth(req);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT * FROM feedback_status_logs WHERE feedback_id = $1 ORDER BY created_at ASC`,
        [req.params.id]
      );
      return res.json(r.rows.map(mapLog));
    }
    res.json(_logs.filter(l => l.feedbackId === req.params.id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

// ─── GET dashboard stats (admin only) ─────────────────────────────────────────
router.get('/stats/dashboard', async (req, res) => {
  const user = auth(req);
  if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending')      AS pending,
          COUNT(*) FILTER (WHERE status = 'under_review') AS under_review,
          COUNT(*) FILTER (WHERE status = 'resolved')     AS resolved,
          COUNT(*) FILTER (WHERE status = 'rejected')     AS rejected,
          COUNT(*) FILTER (WHERE target_type = 'faculty') AS to_faculty,
          COUNT(*) FILTER (WHERE target_type = 'coe')     AS to_coe,
          COUNT(*) FILTER (WHERE target_type = 'dsw')     AS to_dsw,
          COUNT(*) FILTER (WHERE target_type = 'df')      AS to_df,
          COUNT(*) FILTER (WHERE target_type = 'hostel_warden') AS to_hostel,
          COUNT(*) FILTER (WHERE target_type = 'proctor') AS to_proctor,
          COUNT(*) FILTER (WHERE target_type = 'course')  AS to_course,
          COUNT(*) FILTER (WHERE target_type = 'public')  AS to_public,
          COUNT(*)                                         AS total
        FROM feedback
      `);
      return res.json(r.rows[0]);
    }
    const total = _feedbacks.length;
    res.json({
      total,
      pending:      _feedbacks.filter(f => f.status === 'pending').length,
      under_review: _feedbacks.filter(f => f.status === 'under_review').length,
      resolved:     _feedbacks.filter(f => f.status === 'resolved').length,
      rejected:     _feedbacks.filter(f => f.status === 'rejected').length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
