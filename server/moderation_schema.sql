-- =============================================================================
-- MODERATION MODULE SCHEMA MIGRATION
-- Run once; all statements are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- =============================================================================

-- Ensure 'moderator' is a valid role value in users table
-- (existing users.role is VARCHAR — no enum constraint to update)

-- ---------------------------------------------------------------------------
-- 1. moderation_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_assignments (
  id               VARCHAR(36)  PRIMARY KEY,
  paper_id         VARCHAR(36)  NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  moderator_id     VARCHAR(36)  NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  assigned_by      VARCHAR(36)  REFERENCES users(id),
  status           VARCHAR(20)  NOT NULL DEFAULT 'assigned',
    -- pending | assigned | under_review | moderated | approved | rejected
  deadline         TIMESTAMPTZ,
  instructions     TEXT         DEFAULT '',
  access_key       VARCHAR(64)  UNIQUE,   -- tamper-evident per-assignment key
  assigned_at      TIMESTAMPTZ  DEFAULT NOW(),
  started_at       TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_paper_id     ON moderation_assignments(paper_id);
CREATE INDEX IF NOT EXISTS idx_ma_moderator_id ON moderation_assignments(moderator_id);
CREATE INDEX IF NOT EXISTS idx_ma_status       ON moderation_assignments(status);

-- ---------------------------------------------------------------------------
-- 2. moderated_papers  (stores the moderator-edited copy; original untouched)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderated_papers (
  id                VARCHAR(36)  PRIMARY KEY,
  assignment_id     VARCHAR(36)  NOT NULL REFERENCES moderation_assignments(id) ON DELETE CASCADE,
  paper_id          VARCHAR(36)  NOT NULL REFERENCES exam_papers(id),
  moderator_id      VARCHAR(36)  REFERENCES users(id),
  title             VARCHAR(200),
  subject           VARCHAR(200),
  course_code       VARCHAR(20),
  instructions      TEXT,
  total_marks       INTEGER,
  duration_mins     INTEGER,
  exam_date         DATE,
  exam_type         VARCHAR(20)  DEFAULT 'endterm',
  questions         JSONB        NOT NULL DEFAULT '[]',
  template_config   JSONB        DEFAULT '{}',
  moderation_notes  TEXT,
  is_draft          BOOLEAN      NOT NULL DEFAULT TRUE,
  version           INTEGER      NOT NULL DEFAULT 1,
  pdf_filename      VARCHAR(255),
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_assignment_id ON moderated_papers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_mp_paper_id      ON moderated_papers(paper_id);

-- ---------------------------------------------------------------------------
-- 3. moderation_logs  (immutable audit trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_logs (
  id             VARCHAR(36)  PRIMARY KEY,
  assignment_id  VARCHAR(36)  REFERENCES moderation_assignments(id) ON DELETE SET NULL,
  paper_id       VARCHAR(36)  REFERENCES exam_papers(id)            ON DELETE SET NULL,
  actor_id       VARCHAR(36)  REFERENCES users(id)                  ON DELETE SET NULL,
  actor_name     VARCHAR(100),
  action         VARCHAR(50)  NOT NULL,
    -- assigned | started | draft_saved | submitted | approved | rejected | reassigned | reopened
  notes          TEXT,
  metadata       JSONB        DEFAULT '{}',
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_assignment_id ON moderation_logs(assignment_id);
CREATE INDEX IF NOT EXISTS idx_ml_paper_id      ON moderation_logs(paper_id);
CREATE INDEX IF NOT EXISTS idx_ml_created_at    ON moderation_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. moderation_notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moderation_notifications (
  id             VARCHAR(36)  PRIMARY KEY,
  recipient_id   VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id      VARCHAR(36)  REFERENCES users(id),
  sender_name    VARCHAR(100),
  assignment_id  VARCHAR(36)  REFERENCES moderation_assignments(id) ON DELETE CASCADE,
  paper_id       VARCHAR(36)  REFERENCES exam_papers(id)            ON DELETE SET NULL,
  title          VARCHAR(200) NOT NULL,
  message        TEXT,
  type           VARCHAR(30)  DEFAULT 'assignment',
    -- assignment | reminder | approved | rejected | message
  is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mn_recipient_id ON moderation_notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_mn_is_read      ON moderation_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_mn_created_at   ON moderation_notifications(created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. expert_subject_mapping
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expert_subject_mapping (
  id            VARCHAR(36)  PRIMARY KEY,
  expert_id     VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_code  VARCHAR(50),
  subject_name  VARCHAR(200) NOT NULL,
  department    VARCHAR(100),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esm_expert_id   ON expert_subject_mapping(expert_id);
CREATE INDEX IF NOT EXISTS idx_esm_subject_code ON expert_subject_mapping(subject_code);

-- ---------------------------------------------------------------------------
-- 6. updated_at triggers for mutable tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ma_updated_at  ON moderation_assignments;
CREATE TRIGGER trg_ma_updated_at
  BEFORE UPDATE ON moderation_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mp_updated_at  ON moderated_papers;
CREATE TRIGGER trg_mp_updated_at
  BEFORE UPDATE ON moderated_papers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
