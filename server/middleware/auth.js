const pgdb = require('../pgdb');
const db   = require('../db');

// Extract the calling user from request headers (set by frontend api client).
// Returns { id, role, name } or null.
function extractUser(req) {
  const id   = req.headers['x-user-id'];
  const role = req.headers['x-user-role'];
  const name = req.headers['x-user-name'] || '';
  if (!id || !role) return null;
  return { id, role, name };
}

// Middleware: require authenticated user with one of the listed roles.
function requireRole(...roles) {
  return (req, res, next) => {
    const user = extractUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    req.currentUser = user;
    next();
  };
}

// Middleware: require admin only.
const requireAdmin = requireRole('admin');

// Middleware: require admin or moderator.
const requireModerator = requireRole('admin', 'moderator');

// Middleware: require any authenticated user (any role).
const requireAuth = requireRole('admin', 'moderator', 'faculty', 'student');

// Verify that a moderator is actually assigned to the given paper/assignment.
// Call after requireModerator — augments req.currentUser with assignment info.
async function verifyModeratorOwnership(req, res, next) {
  const user = req.currentUser;
  // Admins bypass ownership checks.
  if (user.role === 'admin') return next();

  const assignmentId = req.params.assignmentId || req.params.id || req.body.assignmentId;
  if (!assignmentId) return res.status(400).json({ error: 'Assignment ID required' });

  try {
    let assignment = null;
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        `SELECT * FROM moderation_assignments WHERE id = $1 AND moderator_id = $2`,
        [assignmentId, user.id]
      );
      assignment = r.rows[0] || null;
    } else {
      assignment = db.get('moderation_assignments', a =>
        a.id === assignmentId && a.moderatorId === user.id
      );
    }

    if (!assignment) {
      return res.status(403).json({ error: 'You are not assigned to this paper' });
    }

    req.assignment = assignment;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

module.exports = { extractUser, requireRole, requireAdmin, requireModerator, requireAuth, verifyModeratorOwnership };
