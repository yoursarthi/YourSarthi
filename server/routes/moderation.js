const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pgdb = require('../pgdb');
const db   = require('../db');
const { requireAdmin, requireModerator, verifyModeratorOwnership } = require('../middleware/auth');

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genAccessKey() {
  return uuidv4().replace(/-/g, '') + Date.now().toString(36);
}

async function insertLog(assignmentId, paperId, actor, action, notes = '', metadata = {}) {
  const entry = {
    id: uuidv4(), assignmentId, paperId,
    actorId: actor?.id || null, actorName: actor?.name || '',
    action, notes, metadata, createdAt: new Date().toISOString(),
  };
  if (pgdb.ready) {
    await pgdb.pool.query(
      `INSERT INTO moderation_logs
         (id, assignment_id, paper_id, actor_id, actor_name, action, notes, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [entry.id, assignmentId, paperId, entry.actorId, entry.actorName, action, notes, JSON.stringify(metadata)]
    );
  } else {
    db.insert('moderation_logs', entry);
  }
}

async function sendNotification({ recipientId, senderId, senderName, assignmentId, paperId, title, message, type = 'assignment' }) {
  const notif = {
    id: uuidv4(), recipientId, senderId, senderName: senderName || '',
    assignmentId, paperId, title, message: message || '', type, isRead: false,
    createdAt: new Date().toISOString(),
  };
  if (pgdb.ready) {
    await pgdb.pool.query(
      `INSERT INTO moderation_notifications
         (id, recipient_id, sender_id, sender_name, assignment_id, paper_id, title, message, type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [notif.id, recipientId, senderId, senderName || '', assignmentId, paperId, title, message || '', type]
    );
  } else {
    db.insert('moderation_notifications', notif);
  }
}

// Fetch a paper's full data (original from exam_papers + exam_questions)
async function fetchOriginalPaper(paperId) {
  if (pgdb.ready) {
    const [pr, qr] = await Promise.all([
      pgdb.pool.query(`SELECT * FROM exam_papers WHERE id = $1`, [paperId]),
      pgdb.pool.query(
        `SELECT * FROM exam_questions WHERE paper_id = $1 ORDER BY question_no`,
        [paperId]
      ),
    ]);
    if (!pr.rows.length) return null;
    return { ...pr.rows[0], questions: qr.rows };
  }
  const paper = db.get('exam_papers', p => p.id === paperId);
  if (!paper) return null;
  const questions = db.all('exam_questions').filter(q => q.paperId === paperId || q.paper_id === paperId);
  return { ...paper, questions };
}

// ─── GET /  — list papers available for moderation ────────────────────────────
// Admin: all papers. Moderator: only their assignments.
router.get('/', requireModerator, async (req, res) => {
  const { currentUser } = req;
  try {
    if (currentUser.role === 'admin') {
      let papers = [];
      if (pgdb.ready) {
        const r = await pgdb.pool.query(`
          SELECT ep.id, ep.title, ep.subject, ep.total_marks, ep.duration_mins,
                 ep.exam_date, ep.created_at,
                 ma.id          AS assignment_id,
                 ma.status      AS moderation_status,
                 ma.deadline,
                 ma.moderator_id,
                 u.name         AS moderator_name,
                 u.email        AS moderator_email
          FROM exam_papers ep
          LEFT JOIN moderation_assignments ma ON ma.paper_id = ep.id
          LEFT JOIN users u ON u.id = ma.moderator_id
          ORDER BY ep.created_at DESC NULLS LAST
        `);
        papers = r.rows;
      } else {
        const allPapers  = db.all('exam_papers');
        const allMeta    = db.all('paper_metadata');
        const allAssigns = db.all('moderation_assignments');
        const allUsers   = db.all('users');
        papers = allPapers.map(p => {
          const meta   = allMeta.find(m => m.paperId === p.id) || {};
          const assign = allAssigns.find(a => a.paperId === p.id);
          const mod    = assign ? allUsers.find(u => u.id === assign.moderatorId) : null;
          return {
            ...p, ...meta,
            assignment_id: assign?.id, moderation_status: assign?.status || 'unassigned',
            deadline: assign?.deadline, moderator_id: assign?.moderatorId,
            moderator_name: mod?.name, moderator_email: mod?.email,
          };
        });
      }
      return res.json({ papers });
    }

    // Moderator: fetch only their assignments
    let assignments = [];
    if (pgdb.ready) {
      const r = await pgdb.pool.query(`
        SELECT ma.*, ep.title AS paper_title, ep.subject, ep.total_marks,
               ep.duration_mins, ep.exam_date, ep.created_at AS paper_created_at,
               u.name AS assigned_by_name
        FROM moderation_assignments ma
        JOIN exam_papers ep ON ep.id = ma.paper_id
        LEFT JOIN users u ON u.id = ma.assigned_by
        WHERE ma.moderator_id = $1
        ORDER BY ma.assigned_at DESC
      `, [currentUser.id]);
      assignments = r.rows;
    } else {
      const allAssigns = db.all('moderation_assignments').filter(a => a.moderatorId === currentUser.id);
      const allPapers  = db.all('exam_papers');
      assignments = allAssigns.map(a => {
        const paper = allPapers.find(p => p.id === a.paperId) || {};
        return { ...a, paper_title: paper.title, subject: paper.subject, total_marks: paper.totalMarks };
      });
    }
    res.json({ assignments });
  } catch (e) {
    console.error('[moderation/list]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /stats  — dashboard statistics ───────────────────────────────────────
router.get('/stats', requireModerator, async (req, res) => {
  const { currentUser } = req;
  try {
    let stats = { total: 0, pending: 0, under_review: 0, moderated: 0, approved: 0, rejected: 0 };
    if (pgdb.ready) {
      const params = currentUser.role === 'admin' ? [] : [currentUser.id];
      const whereClause = currentUser.role === 'admin' ? '' : `WHERE moderator_id = $1`;
      const r = await pgdb.pool.query(
        `SELECT status, COUNT(*) AS cnt FROM moderation_assignments ${whereClause} GROUP BY status`,
        params
      );
      r.rows.forEach(row => {
        stats[row.status] = parseInt(row.cnt);
        stats.total += parseInt(row.cnt);
      });
    } else {
      const assigns = db.all('moderation_assignments').filter(
        a => currentUser.role === 'admin' || a.moderatorId === currentUser.id
      );
      assigns.forEach(a => {
        stats[a.status] = (stats[a.status] || 0) + 1;
        stats.total += 1;
      });
    }
    res.json({ stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /assign  (admin only) ───────────────────────────────────────────────
router.post('/assign', requireAdmin, async (req, res) => {
  const { paperId, moderatorId, deadline, instructions = '' } = req.body;
  const { currentUser } = req;
  if (!paperId || !moderatorId) return res.status(400).json({ error: 'paperId and moderatorId required' });

  try {
    const paper = await fetchOriginalPaper(paperId);
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    let moderator = null;
    if (pgdb.ready) {
      const mr = await pgdb.pool.query(`SELECT id, name, email FROM users WHERE id = $1 AND role = 'moderator'`, [moderatorId]);
      moderator = mr.rows[0] || null;
    } else {
      moderator = db.get('users', u => u.id === moderatorId && u.role === 'moderator');
    }
    if (!moderator) return res.status(404).json({ error: 'Moderator not found' });

    const id        = uuidv4();
    const accessKey = genAccessKey();

    if (pgdb.ready) {
      const existing = await pgdb.pool.query(
        `SELECT id FROM moderation_assignments WHERE paper_id = $1`, [paperId]
      );
      if (existing.rows.length) {
        await pgdb.pool.query(
          `UPDATE moderation_assignments
           SET moderator_id=$1, assigned_by=$2, status='assigned', deadline=$3,
               instructions=$4, assigned_at=NOW(), started_at=NULL, submitted_at=NULL
           WHERE paper_id=$5`,
          [moderatorId, currentUser.id, deadline || null, instructions, paperId]
        );
        const updated = await pgdb.pool.query(
          `SELECT * FROM moderation_assignments WHERE paper_id = $1`, [paperId]
        );
        const assignment = updated.rows[0];
        await insertLog(assignment.id, paperId, currentUser, 'reassigned', `Reassigned to ${moderator.name}`);
        await sendNotification({
          recipientId: moderatorId, senderId: currentUser.id, senderName: currentUser.name,
          assignmentId: assignment.id, paperId,
          title: `[Reassigned] Moderate paper: ${paper.title}`,
          message: `You have been reassigned to moderate "${paper.title}".\n${instructions}`,
          type: 'assignment',
        });
        return res.json({ assignment, reassigned: true });
      }
      await pgdb.pool.query(
        `INSERT INTO moderation_assignments
           (id, paper_id, moderator_id, assigned_by, status, deadline, instructions, access_key)
         VALUES ($1,$2,$3,$4,'assigned',$5,$6,$7)`,
        [id, paperId, moderatorId, currentUser.id, deadline || null, instructions, accessKey]
      );
      const newAssign = await pgdb.pool.query(`SELECT * FROM moderation_assignments WHERE id=$1`, [id]);
      const assignment = newAssign.rows[0];
      await insertLog(id, paperId, currentUser, 'assigned', `Assigned to ${moderator.name}`);
      await sendNotification({
        recipientId: moderatorId, senderId: currentUser.id, senderName: currentUser.name,
        assignmentId: id, paperId,
        title: `Moderation Request: ${paper.title}`,
        message: `You have been assigned to moderate "${paper.title}".\nDeadline: ${deadline || 'Not set'}\n\n${instructions}`,
        type: 'assignment',
      });
      return res.status(201).json({ assignment });
    }

    // JSON fallback
    const existingAssign = db.get('moderation_assignments', a => a.paperId === paperId);
    if (existingAssign) {
      db.update('moderation_assignments', a => a.paperId === paperId, a => ({
        ...a, moderatorId, assignedBy: currentUser.id, status: 'assigned',
        deadline: deadline || null, instructions, assignedAt: new Date().toISOString(),
        startedAt: null, submittedAt: null,
      }));
      await insertLog(existingAssign.id, paperId, currentUser, 'reassigned', `Reassigned to ${moderator.name}`);
      const updated = db.get('moderation_assignments', a => a.paperId === paperId);
      return res.json({ assignment: updated, reassigned: true });
    }

    const newAssign = {
      id, paperId, moderatorId, assignedBy: currentUser.id,
      status: 'assigned', deadline: deadline || null, instructions, accessKey,
      assignedAt: new Date().toISOString(), startedAt: null, submittedAt: null,
      approvedAt: null, rejectedAt: null, rejectionReason: null, createdAt: new Date().toISOString(),
    };
    db.insert('moderation_assignments', newAssign);
    await insertLog(id, paperId, currentUser, 'assigned', `Assigned to ${moderator.name}`);
    await sendNotification({
      recipientId: moderatorId, senderId: currentUser.id, senderName: currentUser.name,
      assignmentId: id, paperId,
      title: `Moderation Request: ${paper.title}`,
      message: `You have been assigned to moderate "${paper.title}".\nDeadline: ${deadline || 'Not set'}\n\n${instructions}`,
      type: 'assignment',
    });
    res.status(201).json({ assignment: newAssign });
  } catch (e) {
    console.error('[moderation/assign]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── Notification routes (before /:assignmentId to avoid shadowing) ────────────

// GET /notifications/list
router.get('/notifications/list', requireModerator, async (req, res) => {
  const { currentUser } = req;
  try {
    let notifications = [];
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT * FROM moderation_notifications WHERE recipient_id=$1 ORDER BY created_at DESC LIMIT 50`,
        [currentUser.id]
      );
      notifications = r.rows;
    } else {
      notifications = db.all('moderation_notifications')
        .filter(n => n.recipientId === currentUser.id)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
    }
    const unread = notifications.filter(n => !n.is_read && !n.isRead).length;
    res.json({ notifications, unread });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /notifications/:id/read
router.patch('/notifications/:id/read', requireModerator, async (req, res) => {
  const { currentUser } = req;
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(
        `UPDATE moderation_notifications SET is_read=TRUE WHERE id=$1 AND recipient_id=$2`,
        [req.params.id, currentUser.id]
      );
    } else {
      db.update('moderation_notifications', n => n.id === req.params.id && n.recipientId === currentUser.id,
        n => ({ ...n, isRead: true })
      );
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /notifications/read-all
router.post('/notifications/read-all', requireModerator, async (req, res) => {
  const { currentUser } = req;
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(
        `UPDATE moderation_notifications SET is_read=TRUE WHERE recipient_id=$1`, [currentUser.id]
      );
    } else {
      const all = db.all('moderation_notifications');
      all.forEach((n, i) => { if (n.recipientId === currentUser.id) all[i].isRead = true; });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /notifications/send  (admin sends message to moderator)
router.post('/notifications/send', requireAdmin, async (req, res) => {
  const { currentUser } = req;
  const { recipientId, assignmentId, paperId, title, message, type = 'message' } = req.body;
  if (!recipientId || !title) return res.status(400).json({ error: 'recipientId and title required' });
  try {
    await sendNotification({
      recipientId, senderId: currentUser.id, senderName: currentUser.name,
      assignmentId, paperId, title, message, type,
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Expert routes (before /:assignmentId to avoid shadowing) ─────────────────

// GET /experts
router.get('/experts', requireModerator, async (req, res) => {
  const { subject, subjectCode } = req.query;
  try {
    let experts = [];
    if (pgdb.ready) {
      let query = `
        SELECT esm.*, u.name AS expert_name, u.email AS expert_email
        FROM expert_subject_mapping esm
        JOIN users u ON u.id = esm.expert_id
        WHERE esm.is_active = TRUE
      `;
      const params = [];
      if (subjectCode) { params.push(subjectCode); query += ` AND esm.subject_code = $${params.length}`; }
      if (subject)     { params.push(`%${subject}%`); query += ` AND esm.subject_name ILIKE $${params.length}`; }
      query += ` ORDER BY esm.subject_name, u.name`;
      const r = await pgdb.pool.query(query, params);
      experts = r.rows;
    } else {
      experts = db.all('expert_subject_mapping').filter(e => {
        if (!e.isActive) return false;
        if (subjectCode && e.subjectCode !== subjectCode) return false;
        if (subject && !e.subjectName?.toLowerCase().includes(subject.toLowerCase())) return false;
        return true;
      });
    }
    res.json({ experts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /experts  (admin only)
router.post('/experts', requireAdmin, async (req, res) => {
  const { expertId, subjectCode, subjectName, department } = req.body;
  if (!expertId || !subjectName) return res.status(400).json({ error: 'expertId and subjectName required' });
  const id = uuidv4();
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(
        `INSERT INTO expert_subject_mapping (id, expert_id, subject_code, subject_name, department)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [id, expertId, subjectCode || '', subjectName, department || '']
      );
    } else {
      db.insert('expert_subject_mapping', {
        id, expertId, subjectCode, subjectName, department, isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
    res.status(201).json({ success: true, id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /experts/:id  (admin only)
router.delete('/experts/:id', requireAdmin, async (req, res) => {
  try {
    if (pgdb.ready) {
      await pgdb.pool.query(`UPDATE expert_subject_mapping SET is_active=FALSE WHERE id=$1`, [req.params.id]);
    } else {
      db.update('expert_subject_mapping', e => e.id === req.params.id, e => ({ ...e, isActive: false }));
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Assignment detail routes (parametric — must come after specific routes) ───

// GET /:assignmentId  — full assignment detail with original paper
router.get('/:assignmentId', requireModerator, verifyModeratorOwnership, async (req, res) => {
  const { assignmentId } = req.params;
  try {
    let assignment = null;
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT ma.*, u.name AS moderator_name, u.email AS moderator_email,
                ab.name AS assigned_by_name
         FROM moderation_assignments ma
         JOIN users u ON u.id = ma.moderator_id
         LEFT JOIN users ab ON ab.id = ma.assigned_by
         WHERE ma.id = $1`,
        [assignmentId]
      );
      assignment = r.rows[0] || null;
    } else {
      assignment = db.get('moderation_assignments', a => a.id === assignmentId);
    }
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const paperId = assignment.paper_id || assignment.paperId;
    const [originalPaper, moderatedPaper, logs] = await Promise.all([
      fetchOriginalPaper(paperId),
      (async () => {
        if (pgdb.ready) {
          const r = await pgdb.pool.query(
            `SELECT * FROM moderated_papers WHERE assignment_id = $1 ORDER BY version DESC LIMIT 1`,
            [assignmentId]
          );
          return r.rows[0] || null;
        }
        const all = db.all('moderated_papers').filter(mp => mp.assignmentId === assignmentId);
        return all.sort((a, b) => (b.version || 0) - (a.version || 0))[0] || null;
      })(),
      (async () => {
        if (pgdb.ready) {
          const r = await pgdb.pool.query(
            `SELECT * FROM moderation_logs WHERE assignment_id = $1 ORDER BY created_at`,
            [assignmentId]
          );
          return r.rows;
        }
        return db.all('moderation_logs').filter(l => l.assignmentId === assignmentId);
      })(),
    ]);

    res.json({ assignment, originalPaper, moderatedPaper, logs });
  } catch (e) {
    console.error('[moderation/get]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// PUT /:assignmentId/start  — mark as under_review
router.put('/:assignmentId/start', requireModerator, verifyModeratorOwnership, async (req, res) => {
  const { assignmentId } = req.params;
  const { currentUser } = req;
  try {
    const paperId = (req.assignment?.paper_id || req.assignment?.paperId);
    if (pgdb.ready) {
      await pgdb.pool.query(
        `UPDATE moderation_assignments
         SET status='under_review', started_at=NOW()
         WHERE id=$1 AND status IN ('assigned','pending')`,
        [assignmentId]
      );
    } else {
      db.update('moderation_assignments', a => a.id === assignmentId, a => ({
        ...a, status: 'under_review', startedAt: new Date().toISOString(),
      }));
    }
    await insertLog(assignmentId, paperId, currentUser, 'started');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /:assignmentId/draft  — save moderated version as draft
router.put('/:assignmentId/draft', requireModerator, verifyModeratorOwnership, async (req, res) => {
  const { assignmentId } = req.params;
  const { currentUser } = req;
  const {
    title, subject, instructions, totalMarks, durationMins, examDate, examType,
    questions = [], moderationNotes = '', templateConfig = {},
  } = req.body;

  try {
    const assignment = req.assignment || {};
    const paperId    = assignment.paper_id || assignment.paperId;

    if (pgdb.ready) {
      const existing = await pgdb.pool.query(
        `SELECT id, version FROM moderated_papers WHERE assignment_id = $1 AND is_draft = TRUE`, [assignmentId]
      );
      if (existing.rows.length) {
        await pgdb.pool.query(
          `UPDATE moderated_papers
           SET title=$1, subject=$2, instructions=$3, total_marks=$4, duration_mins=$5,
               exam_date=$6, exam_type=$7, questions=$8, moderation_notes=$9,
               template_config=$10, moderator_id=$11, version=version+1
           WHERE id=$12`,
          [
            title, subject, instructions, totalMarks, durationMins, examDate || null,
            examType || 'endterm', JSON.stringify(questions), moderationNotes,
            JSON.stringify(templateConfig), currentUser.id, existing.rows[0].id,
          ]
        );
      } else {
        const paperRow = (await pgdb.pool.query(`SELECT * FROM exam_papers WHERE id=$1`, [paperId])).rows[0] || {};
        await pgdb.pool.query(
          `INSERT INTO moderated_papers
             (id, assignment_id, paper_id, moderator_id, title, subject, course_code,
              instructions, total_marks, duration_mins, exam_date, exam_type,
              questions, moderation_notes, template_config, is_draft)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,TRUE)`,
          [
            uuidv4(), assignmentId, paperId, currentUser.id,
            title || paperRow.title, subject || paperRow.subject, paperRow.course_code || '',
            instructions, totalMarks || paperRow.total_marks,
            durationMins || paperRow.duration_mins, examDate || paperRow.exam_date,
            examType || 'endterm', JSON.stringify(questions), moderationNotes,
            JSON.stringify(templateConfig),
          ]
        );
      }
    } else {
      const existing = db.all('moderated_papers').find(mp => mp.assignmentId === assignmentId && mp.isDraft);
      if (existing) {
        db.update('moderated_papers', mp => mp.id === existing.id, mp => ({
          ...mp, title, subject, instructions, totalMarks, durationMins, examDate,
          examType, questions, moderationNotes, templateConfig,
          version: (mp.version || 1) + 1, updatedAt: new Date().toISOString(),
        }));
      } else {
        db.insert('moderated_papers', {
          id: uuidv4(), assignmentId, paperId, moderatorId: currentUser.id,
          title, subject, instructions, totalMarks, durationMins, examDate,
          examType: examType || 'endterm', questions, moderationNotes, templateConfig,
          isDraft: true, version: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
    }

    await insertLog(assignmentId, paperId, currentUser, 'draft_saved', `Draft v${Date.now()}`);
    res.json({ success: true });
  } catch (e) {
    console.error('[moderation/draft]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /:assignmentId/submit  — submit final moderated version
router.post('/:assignmentId/submit', requireModerator, verifyModeratorOwnership, async (req, res) => {
  const { assignmentId } = req.params;
  const { currentUser } = req;
  const {
    title, subject, instructions, totalMarks, durationMins, examDate, examType,
    questions = [], moderationNotes = '', templateConfig = {},
  } = req.body;

  try {
    const assignment = req.assignment || {};
    const paperId    = assignment.paper_id || assignment.paperId;
    const pdfFilename = `${(subject || 'PAPER').replace(/[^a-z0-9]/gi, '_').toUpperCase()}_MODERATED.pdf`;

    if (pgdb.ready) {
      const existing = await pgdb.pool.query(
        `SELECT id FROM moderated_papers WHERE assignment_id = $1`, [assignmentId]
      );
      if (existing.rows.length) {
        await pgdb.pool.query(
          `UPDATE moderated_papers
           SET title=$1, subject=$2, instructions=$3, total_marks=$4, duration_mins=$5,
               exam_date=$6, exam_type=$7, questions=$8, moderation_notes=$9,
               template_config=$10, is_draft=FALSE, pdf_filename=$11, version=version+1
           WHERE id=$12`,
          [
            title, subject, instructions, totalMarks, durationMins, examDate || null,
            examType || 'endterm', JSON.stringify(questions), moderationNotes,
            JSON.stringify(templateConfig), pdfFilename, existing.rows[0].id,
          ]
        );
      } else {
        await pgdb.pool.query(
          `INSERT INTO moderated_papers
             (id, assignment_id, paper_id, moderator_id, title, subject, instructions,
              total_marks, duration_mins, exam_date, exam_type, questions,
              moderation_notes, template_config, is_draft, pdf_filename)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,FALSE,$15)`,
          [
            uuidv4(), assignmentId, paperId, currentUser.id, title, subject, instructions,
            totalMarks, durationMins, examDate || null, examType || 'endterm',
            JSON.stringify(questions), moderationNotes, JSON.stringify(templateConfig), pdfFilename,
          ]
        );
      }
      await pgdb.pool.query(
        `UPDATE moderation_assignments SET status='moderated', submitted_at=NOW() WHERE id=$1`,
        [assignmentId]
      );
      const assignRow = await pgdb.pool.query(
        `SELECT assigned_by, paper_id FROM moderation_assignments WHERE id=$1`, [assignmentId]
      );
      const adminId = assignRow.rows[0]?.assigned_by;
      if (adminId) {
        await sendNotification({
          recipientId: adminId, senderId: currentUser.id, senderName: currentUser.name,
          assignmentId, paperId,
          title: `Paper Moderated: ${title}`,
          message: `Moderator ${currentUser.name} has submitted the moderated version of "${title}". Please review and approve.`,
          type: 'moderated',
        });
      }
    } else {
      const existing = db.all('moderated_papers').find(mp => mp.assignmentId === assignmentId);
      if (existing) {
        db.update('moderated_papers', mp => mp.id === existing.id, mp => ({
          ...mp, title, subject, instructions, totalMarks, durationMins, examDate,
          examType, questions, moderationNotes, templateConfig,
          isDraft: false, pdfFilename, version: (mp.version || 1) + 1, updatedAt: new Date().toISOString(),
        }));
      } else {
        db.insert('moderated_papers', {
          id: uuidv4(), assignmentId, paperId, moderatorId: currentUser.id,
          title, subject, instructions, totalMarks, durationMins, examDate,
          examType: examType || 'endterm', questions, moderationNotes, templateConfig,
          isDraft: false, pdfFilename, version: 1,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        });
      }
      db.update('moderation_assignments', a => a.id === assignmentId, a => ({
        ...a, status: 'moderated', submittedAt: new Date().toISOString(),
      }));
    }

    await insertLog(assignmentId, paperId, currentUser, 'submitted', 'Final moderated paper submitted');
    res.json({ success: true, pdfFilename });
  } catch (e) {
    console.error('[moderation/submit]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /:assignmentId/approve  (admin only)
router.post('/:assignmentId/approve', requireAdmin, async (req, res) => {
  const { assignmentId } = req.params;
  const { currentUser } = req;
  const { notes = '' } = req.body;
  try {
    let paperId, moderatorId;
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `UPDATE moderation_assignments SET status='approved', approved_at=NOW()
         WHERE id=$1 RETURNING paper_id, moderator_id`, [assignmentId]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Assignment not found' });
      ({ paper_id: paperId, moderator_id: moderatorId } = r.rows[0]);
    } else {
      const a = db.get('moderation_assignments', a => a.id === assignmentId);
      if (!a) return res.status(404).json({ error: 'Assignment not found' });
      paperId = a.paperId; moderatorId = a.moderatorId;
      db.update('moderation_assignments', a => a.id === assignmentId, a => ({
        ...a, status: 'approved', approvedAt: new Date().toISOString(),
      }));
    }
    await insertLog(assignmentId, paperId, currentUser, 'approved', notes);
    await sendNotification({
      recipientId: moderatorId, senderId: currentUser.id, senderName: currentUser.name,
      assignmentId, paperId,
      title: 'Paper Approved',
      message: `Your moderated paper has been approved by ${currentUser.name}. ${notes}`,
      type: 'approved',
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /:assignmentId/reject  (admin only)
router.post('/:assignmentId/reject', requireAdmin, async (req, res) => {
  const { assignmentId } = req.params;
  const { currentUser } = req;
  const { reason = '' } = req.body;
  try {
    let paperId, moderatorId;
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `UPDATE moderation_assignments
         SET status='assigned', rejected_at=NOW(), rejection_reason=$1, submitted_at=NULL
         WHERE id=$2 RETURNING paper_id, moderator_id`,
        [reason, assignmentId]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Assignment not found' });
      ({ paper_id: paperId, moderator_id: moderatorId } = r.rows[0]);
      await pgdb.pool.query(
        `UPDATE moderated_papers SET is_draft=TRUE WHERE assignment_id=$1`, [assignmentId]
      );
    } else {
      const a = db.get('moderation_assignments', a => a.id === assignmentId);
      if (!a) return res.status(404).json({ error: 'Assignment not found' });
      paperId = a.paperId; moderatorId = a.moderatorId;
      db.update('moderation_assignments', a => a.id === assignmentId, a => ({
        ...a, status: 'assigned', rejectedAt: new Date().toISOString(), rejectionReason: reason, submittedAt: null,
      }));
      db.update('moderated_papers', mp => mp.assignmentId === assignmentId, mp => ({ ...mp, isDraft: true }));
    }
    await insertLog(assignmentId, paperId, currentUser, 'rejected', reason);
    await sendNotification({
      recipientId: moderatorId, senderId: currentUser.id, senderName: currentUser.name,
      assignmentId, paperId,
      title: 'Paper Returned for Revision',
      message: `Your moderated paper has been returned for revision by ${currentUser.name}.\nReason: ${reason}`,
      type: 'rejected',
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /:assignmentId/logs  — full audit trail
router.get('/:assignmentId/logs', requireModerator, async (req, res) => {
  const { assignmentId } = req.params;
  try {
    let logs = [];
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT * FROM moderation_logs WHERE assignment_id=$1 ORDER BY created_at`, [assignmentId]
      );
      logs = r.rows;
    } else {
      logs = db.all('moderation_logs').filter(l => l.assignmentId === assignmentId);
    }
    res.json({ logs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
