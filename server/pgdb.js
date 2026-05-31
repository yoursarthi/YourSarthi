const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let _pool = null;
let _ready = false;

async function init() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[pgdb] DATABASE_URL not set — running on JSON file store');
    return;
  }
  try {
    _pool = new Pool({ connectionString: url });
    const client = await _pool.connect();
    try {
      // Run the full schema (idempotent — all CREATE IF NOT EXISTS, ON CONFLICT DO NOTHING)
      // Strip UTF-8 BOM if present (editor artifact)
      let schema = fs.readFileSync(path.join(__dirname, 'schema_clean.sql'), 'utf8');
      if (schema.charCodeAt(0) === 0xFEFF) schema = schema.slice(1);
      // Make trigger creation idempotent: prepend DROP TRIGGER IF EXISTS before each CREATE TRIGGER
      schema = schema.replace(
        /CREATE TRIGGER (\w+)\s+\n\s+BEFORE UPDATE ON (\w+)/g,
        (_, name, table) => `DROP TRIGGER IF EXISTS ${name} ON ${table};\nCREATE TRIGGER ${name}\n  BEFORE UPDATE ON ${table}`
      );
      // Fix v_co_attainment: correlated subquery references q before q is joined — rewrite FROM clause
      schema = schema.replace(
        /CREATE OR REPLACE VIEW v_co_attainment AS[\s\S]*?GROUP BY q\.course_id, q\.course_code, q\.co, q\.po, q\.blooms;/,
        `CREATE OR REPLACE VIEW v_co_attainment AS
  SELECT
    q.course_id,
    q.course_code,
    q.co,
    q.po,
    q.blooms,
    COUNT(qr.id)                                    AS responses_count,
    ROUND(AVG(qr.marks_awarded / NULLIF(qr.max_marks, 0) * 100), 2) AS avg_attainment_pct
  FROM questions q
  JOIN exam_questions eq  ON q.course_code = eq.question_text
  JOIN exam_papers    ep  ON eq.paper_id = ep.id AND ep.course_id = q.course_id
  JOIN question_responses qr ON qr.question_no = eq.question_no
  WHERE qr.max_marks > 0
  GROUP BY q.course_id, q.course_code, q.co, q.po, q.blooms;`
      );
      await client.query(schema);

      // Add compat columns for the result-level marksheet flow
      await client.query(`
        ALTER TABLE marksheets
          ADD COLUMN IF NOT EXISTS result_id VARCHAR(36) REFERENCES student_results(id) ON DELETE CASCADE;
        ALTER TABLE marksheets
          ADD COLUMN IF NOT EXISTS paper_id VARCHAR(36) REFERENCES exam_papers(id) ON DELETE CASCADE;
      `);

      // Add extra columns not in schema_clean.sql
      await client.query(`
        ALTER TABLE exam_papers
          ADD COLUMN IF NOT EXISTS duration_mins INTEGER DEFAULT 180;
        ALTER TABLE exam_papers
          ADD COLUMN IF NOT EXISTS instructions TEXT DEFAULT '';
        ALTER TABLE exam_papers
          ADD COLUMN IF NOT EXISTS exam_date DATE;
        ALTER TABLE exam_questions
          ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'short';
        ALTER TABLE exam_questions
          ADD COLUMN IF NOT EXISTS section_label VARCHAR(10) DEFAULT 'A';
        ALTER TABLE questions
          ADD COLUMN IF NOT EXISTS answer TEXT DEFAULT '';
        ALTER TABLE exam_questions
          ADD COLUMN IF NOT EXISTS answer TEXT DEFAULT '';
      `);

      // Widen VARCHAR columns to TEXT — only if not already TEXT (avoids view dependency error)
      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'exam_questions' AND column_name = 'question_text' AND data_type <> 'text'
          ) THEN
            ALTER TABLE exam_questions ALTER COLUMN question_text TYPE TEXT;
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'questions' AND column_name = 'text' AND data_type <> 'text'
          ) THEN
            ALTER TABLE questions ALTER COLUMN text TYPE TEXT;
          END IF;
        END $$;
      `);

      // Moderation module schema
      try {
        let modSchema = fs.readFileSync(path.join(__dirname, 'moderation_schema.sql'), 'utf8');
        if (modSchema.charCodeAt(0) === 0xFEFF) modSchema = modSchema.slice(1);
        await client.query(modSchema);
      } catch (modErr) {
        console.warn('[pgdb] Moderation schema warning:', modErr.message);
      }

      // Ensure exam_papers.course_id column exists (older DBs may not have it)
      await client.query(`
        ALTER TABLE exam_papers ADD COLUMN IF NOT EXISTS course_id VARCHAR(36) REFERENCES courses(id) ON DELETE SET NULL
      `);

      // paper_id is nullable in student_results (evaluations route stores results without a paper)
      await client.query(`
        ALTER TABLE student_results ALTER COLUMN paper_id DROP NOT NULL
      `).catch(() => {});   // silently skip if already nullable or table doesn't exist yet

      await client.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu
              ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'student_results'
              AND ccu.column_name = 'paper_id'
              AND tc.constraint_type = 'FOREIGN KEY'
          ) THEN
            -- Change FK action from CASCADE to SET NULL so rows survive paper deletion
            ALTER TABLE student_results
              DROP CONSTRAINT IF EXISTS student_results_paper_id_fkey;
            ALTER TABLE student_results
              ADD CONSTRAINT student_results_paper_id_fkey
                FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE SET NULL;
          END IF;
        END $$;
      `).catch(() => {});

      // Index for course-wise result lookup: student_results → exam_papers → course_id
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_results_paper ON student_results(paper_id);
        CREATE INDEX IF NOT EXISTS idx_papers_course_id ON exam_papers(course_id) WHERE course_id IS NOT NULL;
      `);

      // Atomic per-year roll number sequence counter
      await client.query(`
        CREATE TABLE IF NOT EXISTS student_roll_sequences (
          year     CHAR(4) PRIMARY KEY,
          last_seq INTEGER NOT NULL DEFAULT 0
        )
      `);

      // Seed sequences from existing student IDs so future inserts don't collide
      await client.query(`
        INSERT INTO student_roll_sequences (year, last_seq)
        SELECT
          SUBSTRING(id FROM 4 FOR 4) AS year,
          MAX(CAST(SUBSTRING(id FROM 8) AS INTEGER)) AS last_seq
        FROM students
        WHERE id ~ '^ITM[0-9]{4}[0-9]+$'
        GROUP BY SUBSTRING(id FROM 4 FOR 4)
        ON CONFLICT (year) DO UPDATE
          SET last_seq = GREATEST(student_roll_sequences.last_seq, EXCLUDED.last_seq)
      `);

      // Partial unique index on email (safe for empty/null existing rows)
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'students' AND indexname = 'students_email_unique_idx'
          ) THEN
            CREATE UNIQUE INDEX students_email_unique_idx
              ON students (email)
              WHERE email IS NOT NULL AND email <> '';
          END IF;
        END $$;
      `);

      // Extra tables not in schema_clean.sql
      await client.query(`
        CREATE TABLE IF NOT EXISTS syllabi (
          id          VARCHAR(36)  PRIMARY KEY,
          course_code VARCHAR(20)  DEFAULT '',
          course_id   VARCHAR(36),
          title       VARCHAR(200) DEFAULT '',
          credits     INTEGER      DEFAULT 3,
          units       JSONB        DEFAULT '[]',
          cos         JSONB        DEFAULT '[]',
          pos         JSONB        DEFAULT '[]',
          created_at  TIMESTAMPTZ  DEFAULT NOW()
        )
      `);

      // Faculty extended profile columns
      await client.query(`
        ALTER TABLE faculty
          ADD COLUMN IF NOT EXISTS date_of_birth        DATE,
          ADD COLUMN IF NOT EXISTS address              TEXT         DEFAULT '',
          ADD COLUMN IF NOT EXISTS father_name          VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS mother_name          VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS spouse_name          VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS ug_degree            VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS ug_college           VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS pg_degree            VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS pg_college           VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS phd_title            VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS phd_university       VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS phd_year             SMALLINT,
          ADD COLUMN IF NOT EXISTS research_contributions TEXT        DEFAULT '',
          ADD COLUMN IF NOT EXISTS patents              TEXT         DEFAULT '',
          ADD COLUMN IF NOT EXISTS awards               TEXT         DEFAULT ''
      `);

      // Feedback system tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS feedback (
          id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          author_id   VARCHAR(36)  NOT NULL,
          author_name VARCHAR(255) NOT NULL DEFAULT '',
          author_role VARCHAR(20)  NOT NULL DEFAULT 'student',
          type        VARCHAR(30)  NOT NULL DEFAULT 'feedback'
                        CHECK (type IN ('feedback','complaint','suggestion')),
          title       VARCHAR(255) NOT NULL,
          content     TEXT         NOT NULL DEFAULT '',
          status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','reviewed','resolved')),
          is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS feedback_replies (
          id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          feedback_id VARCHAR(36)  NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
          author_id   VARCHAR(36)  NOT NULL,
          author_name VARCHAR(255) NOT NULL DEFAULT '',
          author_role VARCHAR(20)  NOT NULL DEFAULT 'admin',
          content     TEXT         NOT NULL DEFAULT '',
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_feedback_status    ON feedback(status);
        CREATE INDEX IF NOT EXISTS idx_feedback_type      ON feedback(type);
        CREATE INDEX IF NOT EXISTS idx_feedback_author    ON feedback(author_id);
        CREATE INDEX IF NOT EXISTS idx_fb_replies_parent  ON feedback_replies(feedback_id)
      `);

      // Extended feedback columns (v2 redesign)
      await client.query(`
        ALTER TABLE feedback
          ADD COLUMN IF NOT EXISTS submission_type VARCHAR(50) DEFAULT 'feedback',
          ADD COLUMN IF NOT EXISTS target_type     VARCHAR(30) DEFAULT 'public',
          ADD COLUMN IF NOT EXISTS target_id       VARCHAR(36) DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS target_name     VARCHAR(255) DEFAULT '',
          ADD COLUMN IF NOT EXISTS visibility      VARCHAR(20) NOT NULL DEFAULT 'public',
          ADD COLUMN IF NOT EXISTS anon_author_id   VARCHAR(36) DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS anon_author_name VARCHAR(255) DEFAULT ''
      `);

      // Drop legacy CHECK constraints on feedback.type and feedback.status so new types/statuses work
      await client.query(`
        DO $$
        DECLARE
          cname TEXT;
        BEGIN
          SELECT constraint_name INTO cname
            FROM information_schema.table_constraints
            WHERE table_name = 'feedback' AND constraint_type = 'CHECK' AND constraint_name LIKE '%type%';
          IF cname IS NOT NULL THEN
            EXECUTE 'ALTER TABLE feedback DROP CONSTRAINT IF EXISTS ' || cname;
          END IF;
          SELECT constraint_name INTO cname
            FROM information_schema.table_constraints
            WHERE table_name = 'feedback' AND constraint_type = 'CHECK' AND constraint_name LIKE '%status%';
          IF cname IS NOT NULL THEN
            EXECUTE 'ALTER TABLE feedback DROP CONSTRAINT IF EXISTS ' || cname;
          END IF;
        END $$;
      `);

      // Feedback status change log
      await client.query(`
        CREATE TABLE IF NOT EXISTS feedback_status_logs (
          id           VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          feedback_id  VARCHAR(36)  NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
          changed_by   VARCHAR(36),
          changer_name VARCHAR(255) DEFAULT '',
          changer_role VARCHAR(20)  DEFAULT '',
          old_status   VARCHAR(20)  DEFAULT '',
          new_status   VARCHAR(20)  DEFAULT '',
          note         TEXT         DEFAULT '',
          created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_fb_status_logs ON feedback_status_logs(feedback_id)
      `);

      // File uploads metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS file_uploads (
          id           VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          file_name    VARCHAR(255) NOT NULL,
          file_path    TEXT         NOT NULL,
          file_type    VARCHAR(50)  DEFAULT '',
          mime_type    VARCHAR(100) DEFAULT '',
          file_size    BIGINT       DEFAULT 0,
          category     VARCHAR(50)  DEFAULT 'general',
          uploaded_by  VARCHAR(36),
          uploader_name VARCHAR(255) DEFAULT '',
          uploader_role VARCHAR(20)  DEFAULT '',
          related_id   VARCHAR(36),
          related_type VARCHAR(50)  DEFAULT '',
          created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON file_uploads(uploaded_by);
        CREATE INDEX IF NOT EXISTS idx_file_uploads_related     ON file_uploads(related_id, related_type);
        CREATE INDEX IF NOT EXISTS idx_file_uploads_category    ON file_uploads(category)
      `);

      // AI Tutor tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS course_documents (
          id            VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id     VARCHAR(36)  NOT NULL,
          file_name     VARCHAR(255) NOT NULL,
          file_path     TEXT         NOT NULL,
          file_type     VARCHAR(10)  DEFAULT 'pdf',
          file_size     BIGINT       DEFAULT 0,
          status        VARCHAR(20)  DEFAULT 'processing',
          chunk_count   INTEGER      DEFAULT 0,
          uploaded_by   VARCHAR(36),
          uploader_name VARCHAR(255) DEFAULT '',
          created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          doc_id      VARCHAR(36)  NOT NULL,
          course_id   VARCHAR(36)  NOT NULL,
          chunk_index INTEGER      NOT NULL,
          chunk_text  TEXT         NOT NULL,
          embedding   JSONB,
          token_count INTEGER      DEFAULT 0,
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ai_chat_sessions (
          id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id   VARCHAR(36)  NOT NULL,
          user_id     VARCHAR(36)  NOT NULL,
          user_name   VARCHAR(255) DEFAULT '',
          title       VARCHAR(255) DEFAULT 'New Chat',
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ai_chat_messages (
          id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id  VARCHAR(36)  NOT NULL,
          role        VARCHAR(10)  NOT NULL DEFAULT 'user',
          content     TEXT         NOT NULL,
          sources     JSONB        DEFAULT '[]',
          created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_course_docs_course   ON course_documents(course_id);
        CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc       ON document_chunks(doc_id);
        CREATE INDEX IF NOT EXISTS idx_doc_chunks_course    ON document_chunks(course_id);
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_course ON ai_chat_sessions(course_id);
        CREATE INDEX IF NOT EXISTS idx_chat_sessions_user   ON ai_chat_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_chat_messages_sess   ON ai_chat_messages(session_id)
      `);

      // ── Result Management System ──────────────────────────────────────────
      await client.query(`
        CREATE TABLE IF NOT EXISTS result_components (
          id                VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          component_name    VARCHAR(100) NOT NULL UNIQUE,
          default_weightage DECIMAL(5,2) NOT NULL DEFAULT 0,
          max_marks         INTEGER      NOT NULL DEFAULT 100,
          description       TEXT         DEFAULT '',
          is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
          created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        INSERT INTO result_components (component_name, default_weightage, max_marks, description) VALUES
          ('Endterm',    70, 70,  'End semester examination'),
          ('Midterm',    20, 30,  'Mid semester examination'),
          ('Quiz',        5, 10,  'Regular quizzes'),
          ('Assignment',  5, 10,  'Assignments and homework'),
          ('Practical',   0, 50,  'Lab / practical examination'),
          ('Internal',    0, 30,  'Internal continuous assessment')
        ON CONFLICT (component_name) DO NOTHING
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS component_marks (
          id             VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id     VARCHAR(36)   NOT NULL REFERENCES students(id)          ON DELETE CASCADE,
          course_id      VARCHAR(36)   NOT NULL REFERENCES courses(id)           ON DELETE CASCADE,
          semester       VARCHAR(50)   NOT NULL DEFAULT '',
          academic_year  VARCHAR(20)   NOT NULL DEFAULT '',
          component_id   VARCHAR(36)   NOT NULL REFERENCES result_components(id) ON DELETE RESTRICT,
          marks_obtained DECIMAL(7,2)  NOT NULL DEFAULT 0,
          max_marks      INTEGER       NOT NULL DEFAULT 100,
          faculty_id     VARCHAR(36)   REFERENCES faculty(id) ON DELETE SET NULL,
          exam_session   VARCHAR(100)  DEFAULT '',
          remarks        TEXT          DEFAULT '',
          is_locked      BOOLEAN       NOT NULL DEFAULT FALSE,
          created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
          updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
          UNIQUE (student_id, course_id, semester, academic_year, component_id)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_comp_marks_student ON component_marks(student_id);
        CREATE INDEX IF NOT EXISTS idx_comp_marks_course  ON component_marks(course_id);
        CREATE INDEX IF NOT EXISTS idx_comp_marks_sem     ON component_marks(semester, academic_year);
        CREATE INDEX IF NOT EXISTS idx_comp_marks_faculty ON component_marks(faculty_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS marksheet_templates (
          id            VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          template_name VARCHAR(255) NOT NULL,
          description   TEXT         DEFAULT '',
          semester      VARCHAR(50)  DEFAULT '',
          program_id    VARCHAR(36)  REFERENCES programs(id)  ON DELETE SET NULL,
          created_by    VARCHAR(36)  REFERENCES faculty(id)   ON DELETE SET NULL,
          is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
          created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS marksheet_template_components (
          id                   VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          template_id          VARCHAR(36)  NOT NULL REFERENCES marksheet_templates(id) ON DELETE CASCADE,
          component_id         VARCHAR(36)  NOT NULL REFERENCES result_components(id)   ON DELETE RESTRICT,
          weightage_percentage DECIMAL(5,2) NOT NULL DEFAULT 0
                                 CHECK (weightage_percentage >= 0 AND weightage_percentage <= 100),
          UNIQUE (template_id, component_id)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS generated_marksheets (
          id                  VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id          VARCHAR(36)  REFERENCES students(id)            ON DELETE SET NULL,
          template_id         VARCHAR(36)  REFERENCES marksheet_templates(id) ON DELETE SET NULL,
          semester            VARCHAR(50)  DEFAULT '',
          academic_year       VARCHAR(20)  DEFAULT '',
          generated_pdf_path  TEXT         DEFAULT '',
          generated_by        VARCHAR(36)  REFERENCES faculty(id)             ON DELETE SET NULL,
          generated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          marksheet_data      JSONB        NOT NULL DEFAULT '{}'
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_gen_ms_student  ON generated_marksheets(student_id);
        CREATE INDEX IF NOT EXISTS idx_gen_ms_template ON generated_marksheets(template_id);
        CREATE INDEX IF NOT EXISTS idx_gen_ms_sem      ON generated_marksheets(semester, academic_year)
      `);

      // ── OBE / CO-PO Attainment System ──────────────────────────────────
      await client.query(`
        CREATE TABLE IF NOT EXISTS course_outcomes (
          id                VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id         VARCHAR(36)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          co_code           VARCHAR(20)  NOT NULL,
          co_description    TEXT         DEFAULT '',
          bloom_level       VARCHAR(50)  DEFAULT '',
          target_attainment INTEGER      NOT NULL DEFAULT 2,
          created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          UNIQUE (course_id, co_code)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_co_course ON course_outcomes(course_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS component_co_mapping (
          id             VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id      VARCHAR(36)  NOT NULL REFERENCES courses(id)           ON DELETE CASCADE,
          component_id   VARCHAR(36)  NOT NULL REFERENCES result_components(id) ON DELETE CASCADE,
          co_id          VARCHAR(36)  NOT NULL REFERENCES course_outcomes(id)   ON DELETE CASCADE,
          co_weight      DECIMAL(5,2) NOT NULL DEFAULT 1,
          created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          UNIQUE (course_id, component_id, co_id)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS program_outcomes (
          id              VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          program_id      VARCHAR(36)  REFERENCES programs(id) ON DELETE CASCADE,
          po_code         VARCHAR(20)  NOT NULL,
          po_description  TEXT         DEFAULT '',
          created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          UNIQUE (program_id, po_code)
        )
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_po_program ON program_outcomes(program_id)
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS co_po_mapping (
          id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
          co_id            VARCHAR(36)  NOT NULL REFERENCES course_outcomes(id)  ON DELETE CASCADE,
          po_id            VARCHAR(36)  NOT NULL REFERENCES program_outcomes(id) ON DELETE CASCADE,
          mapping_strength INTEGER      NOT NULL DEFAULT 0
                             CHECK (mapping_strength >= 0 AND mapping_strength <= 3),
          created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
          UNIQUE (co_id, po_id)
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS obe_course_config (
          id              VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id       VARCHAR(36)   NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          threshold_pct   INTEGER       NOT NULL DEFAULT 60,
          level_3_pct     INTEGER       NOT NULL DEFAULT 80,
          level_2_pct     INTEGER       NOT NULL DEFAULT 70,
          level_1_pct     INTEGER       NOT NULL DEFAULT 60,
          target_level    INTEGER       NOT NULL DEFAULT 2,
          weight_direct   DECIMAL(4,3)  NOT NULL DEFAULT 0.800,
          weight_indirect DECIMAL(4,3)  NOT NULL DEFAULT 0.200,
          created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
          updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
          UNIQUE (course_id)
        )
      `);

    } finally {
      client.release();
    }
    _ready = true;
    console.log('[pgdb] PostgreSQL connected and schema ready');
  } catch (e) {
    console.warn('[pgdb] Init failed:', e.message);
    _pool = null;
    _ready = false;
  }
}

// Resolve a department name → id (returns null if not found)
async function getDeptId(name) {
  if (!name || !_pool) return null;
  const r = await _pool.query('SELECT id FROM departments WHERE name = $1', [name]);
  return r.rows[0]?.id ?? null;
}

// Resolve a program name → id (returns null if not found)
async function getProgramId(name) {
  if (!name || !_pool) return null;
  const r = await _pool.query('SELECT id FROM programs WHERE name = $1', [name]);
  return r.rows[0]?.id ?? null;
}

// Resolve a course code → { id, name } (returns null if not found)
async function getCourseByCode(code) {
  if (!code || !_pool) return null;
  const r = await _pool.query('SELECT id, name FROM courses WHERE code = $1', [code]);
  return r.rows[0] ?? null;
}

module.exports = {
  get pool() { return _pool; },
  get ready() { return _ready; },
  init,
  getDeptId,
  getProgramId,
  getCourseByCode,
};
