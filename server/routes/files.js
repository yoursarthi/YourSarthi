const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const pgdb = require('../pgdb');
const router = express.Router();

const UPLOADS_ROOT = path.join(__dirname, '../uploads');

const CATEGORY_MAP = {
  answers:  'students/answersheets',
  courses:  'courses',
  syllabus: 'syllabus',
  faculty:  'faculty',
  moderated:'moderated',
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_SIZE_MB = 50;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || req.query.category || 'courses';
    const subDir = CATEGORY_MAP[category] || 'courses';
    const dir = path.join(UPLOADS_ROOT, subDir);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').replace(ext, '');
    cb(null, `${safeName}_${uuidv4().slice(0, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

function auth(req) {
  return {
    id:   req.headers['x-user-id']   || '',
    role: req.headers['x-user-role'] || '',
    name: req.headers['x-user-name'] || '',
  };
}

function mapFile(row) {
  return {
    id:           row.id,
    fileName:     row.file_name,
    filePath:     row.file_path,
    fileType:     row.file_type,
    mimeType:     row.mime_type,
    fileSize:     row.file_size,
    category:     row.category,
    uploadedBy:   row.uploaded_by,
    uploaderName: row.uploader_name,
    uploaderRole: row.uploader_role,
    relatedId:    row.related_id,
    relatedType:  row.related_type,
    createdAt:    row.created_at,
    url:          `/api/files/download/${row.id}`,
  };
}

// ─── POST upload file ─────────────────────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const user = auth(req);
  const { category = 'courses', relatedId = '', relatedType = '' } = req.body;
  const subDir = CATEGORY_MAP[category] || 'courses';
  const relativePath = path.join(subDir, req.file.filename).replace(/\\/g, '/');
  const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

  try {
    if (pgdb.ready) {
      const id = uuidv4();
      await pgdb.pool.query(
        `INSERT INTO file_uploads
           (id, file_name, file_path, file_type, mime_type, file_size,
            category, uploaded_by, uploader_name, uploader_role,
            related_id, related_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id, req.file.originalname, relativePath, ext,
          req.file.mimetype, req.file.size,
          category, user.id, user.name, user.role,
          relatedId || null, relatedType || '',
        ]
      );
      return res.status(201).json({
        id, fileName: req.file.originalname, filePath: relativePath,
        fileType: ext, mimeType: req.file.mimetype, fileSize: req.file.size,
        url: `/api/files/download/${id}`,
        category, uploadedBy: user.id, uploaderName: user.name,
      });
    }

    res.status(201).json({
      id: uuidv4(),
      fileName: req.file.originalname,
      filePath: relativePath,
      fileType: ext,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      url: `/uploads/${relativePath}`,
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    console.error('[files] upload error:', err.message);
    res.status(500).json({ error: 'Failed to save file metadata' });
  }
});

// ─── GET list files ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { category, relatedId, relatedType } = req.query;
  const user = auth(req);

  try {
    if (pgdb.ready) {
      const conditions = [];
      const params = [];

      if (category)    { params.push(category);    conditions.push(`category = $${params.length}`); }
      if (relatedId)   { params.push(relatedId);   conditions.push(`related_id = $${params.length}`); }
      if (relatedType) { params.push(relatedType); conditions.push(`related_type = $${params.length}`); }

      // Students can only see their own files
      if (user.role === 'student') {
        params.push(user.id);
        conditions.push(`uploaded_by = $${params.length}`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const r = await pgdb.pool.query(
        `SELECT * FROM file_uploads ${where} ORDER BY created_at DESC`,
        params
      );
      return res.json(r.rows.map(mapFile));
    }
    res.json([]);
  } catch (err) {
    console.error('[files] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// ─── GET download file ────────────────────────────────────────────────────────
router.get('/download/:id', async (req, res) => {
  const user = auth(req);
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        'SELECT * FROM file_uploads WHERE id = $1', [req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'File not found' });
      const file = r.rows[0];

      // Students can only download their own answer sheets
      if (user.role === 'student' && file.category === 'answers' && file.uploaded_by !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const filePath = path.join(UPLOADS_ROOT, file.file_path);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
      return res.download(filePath, file.file_name);
    }
    res.status(503).json({ error: 'Database not available' });
  } catch (err) {
    console.error('[files] download error:', err.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

// ─── DELETE file ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const user = auth(req);
  try {
    if (pgdb.ready) {
      const r = await pgdb.pool.query(
        'SELECT * FROM file_uploads WHERE id = $1', [req.params.id]
      );
      if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
      const file = r.rows[0];

      if (user.role !== 'admin' && file.uploaded_by !== user.id)
        return res.status(403).json({ error: 'Access denied' });

      const filePath = path.join(UPLOADS_ROOT, file.file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      await pgdb.pool.query('DELETE FROM file_uploads WHERE id = $1', [req.params.id]);
      return res.json({ ok: true });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[files] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(413).json({ error: `File too large. Maximum size is ${MAX_SIZE_MB}MB` });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = router;
