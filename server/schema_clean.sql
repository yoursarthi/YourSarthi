
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() fallback
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fuzzy search on names

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE TABLE IF NOT EXISTS departments (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL UNIQUE,
  code        VARCHAR(20)  NOT NULL UNIQUE,   -- CSE, ECE, MGT ...
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programs (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL UNIQUE,  -- B.Tech CSE, MBA 
  short_name       VARCHAR(50)  DEFAULT '',
  department_id    VARCHAR(36)  REFERENCES departments(id) ON DELETE SET NULL,
  duration_years   SMALLINT     NOT NULL DEFAULT 4,
  total_semesters  SMALLINT     NOT NULL DEFAULT 8,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt hash, min cost 10
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'faculty'
                  CHECK (role IN ('admin', 'faculty')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS faculty (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          VARCHAR(36)  UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  phone            VARCHAR(20)  DEFAULT '',
  department_id    VARCHAR(36)  REFERENCES departments(id) ON DELETE SET NULL,
  designation      VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor'
                     CHECK (designation IN (
                       'Professor', 'Associate Professor', 'Assistant Professor',
                       'Lecturer', 'HOD', 'Visiting Faculty'
                     )),
  specialization   VARCHAR(255) DEFAULT '',
  qualification    VARCHAR(255) DEFAULT '',
  experience_years SMALLINT     DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_faculty_updated_at ON faculty;
CREATE TRIGGER trg_faculty_updated_at
  BEFORE UPDATE ON faculty
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS hod_id VARCHAR(36) REFERENCES faculty(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS students (
  id                VARCHAR(36)  PRIMARY KEY,           -- e.g. ITM2024001   also the login password
  enrollment_no     VARCHAR(100) UNIQUE,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  department_id     VARCHAR(36)  REFERENCES departments(id) ON DELETE SET NULL,
  program_id        VARCHAR(36)  REFERENCES programs(id) ON DELETE SET NULL,
  batch             VARCHAR(20)  NOT NULL,               -- 2024-2028
  category          VARCHAR(20)  NOT NULL DEFAULT 'General'
                      CHECK (category IN ('General','OBC','OBC-NCL','SC','ST','EWS')),
  father_name       VARCHAR(255) DEFAULT '',
  mother_name       VARCHAR(255) DEFAULT '',
  permanent_address TEXT         DEFAULT '',
  status            VARCHAR(20)  NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','inactive','pending','graduated')),

  phone             VARCHAR(20)  DEFAULT '',
  whatsapp          VARCHAR(20)  DEFAULT '',
  gender            VARCHAR(30)  DEFAULT ''
                      CHECK (gender IN ('Male','Female','Other','Prefer not to say','')),
  date_of_birth     DATE,
  nationality       VARCHAR(50)  DEFAULT 'Indian',
  religion          VARCHAR(50)  DEFAULT '',
  blood_group       VARCHAR(5)   DEFAULT ''
                      CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown','')),
  medical_history   TEXT         DEFAULT '',
  local_address     TEXT         DEFAULT '',
  hobbies           TEXT         DEFAULT '',
  career_options    TEXT         DEFAULT '',
  achievements      TEXT         DEFAULT '',
  linkedin          VARCHAR(255) DEFAULT '',
  github            VARCHAR(255) DEFAULT '',

  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS profile_change_requests (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  field_name       VARCHAR(100) NOT NULL,        -- e.g. 'first_name', 'department_id'
  old_value        TEXT         NOT NULL DEFAULT '',
  requested_value  TEXT         NOT NULL,
  reason           TEXT         DEFAULT '',
  status           VARCHAR(20)  NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','rejected')),
  reviewed_by      VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  admin_note       TEXT         DEFAULT '',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS courses (
  id             VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(20)  NOT NULL UNIQUE,   -- CSE301
  name           VARCHAR(255) NOT NULL,
  department_id  VARCHAR(36)  REFERENCES departments(id) ON DELETE SET NULL,
  credits        SMALLINT     NOT NULL DEFAULT 3,
  type           VARCHAR(20)  NOT NULL DEFAULT 'Core'
                   CHECK (type IN ('Core','Elective','Lab','Project','Audit')),
  max_students   SMALLINT     NOT NULL DEFAULT 60,
  semester       VARCHAR(10)  NOT NULL DEFAULT '1st',
  description    TEXT         DEFAULT '',
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_courses_updated_at ON courses;
CREATE TRIGGER trg_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS faculty_courses (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id      VARCHAR(36)  NOT NULL REFERENCES faculty(id) ON DELETE CASCADE,
  course_id       VARCHAR(36)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year   VARCHAR(20)  NOT NULL,   -- 2024-25
  semester_label  VARCHAR(20)  NOT NULL DEFAULT 'ODD',  -- ODD / EVEN / specific
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (faculty_id, course_id, academic_year, semester_label)
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    VARCHAR(36)  NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id     VARCHAR(36)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_year VARCHAR(20)  NOT NULL,
  status        VARCHAR(20)  NOT NULL DEFAULT 'enrolled'
                  CHECK (status IN ('enrolled','dropped','completed')),
  enrolled_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id, academic_year)
);



CREATE TABLE IF NOT EXISTS questions (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   VARCHAR(36)  REFERENCES courses(id) ON DELETE SET NULL,
  course_code VARCHAR(20)  NOT NULL DEFAULT '',
  course_name VARCHAR(255) DEFAULT '',
  type        VARCHAR(20)  NOT NULL
                CHECK (type IN ('mcq','short','long','numerical','case-study')),
  topic       VARCHAR(255) DEFAULT '',
  difficulty  VARCHAR(20)  NOT NULL DEFAULT 'medium'
                CHECK (difficulty IN ('easy','medium','hard')),
  co          VARCHAR(20)  DEFAULT '',   -- Course Outcome: CO1, CO2 
  po          VARCHAR(20)  DEFAULT '',   -- Programme Outcome: PO1, PO2 
  blooms      VARCHAR(30)  DEFAULT ''
                CHECK (blooms IN (
                  'remember','understand','apply',
                  'analyze','evaluate','create',''
                )),
  text        TEXT         NOT NULL,
  options     JSONB        DEFAULT NULL,   -- {"A":"...","B":"...","C":"...","D":"..."}
  correct     VARCHAR(5)   DEFAULT NULL,   -- A / B / C / D
  marks       SMALLINT     NOT NULL DEFAULT 1,
  created_by  VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS examinations (
  id              VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  title           VARCHAR(255) NOT NULL,
  type            VARCHAR(30)  NOT NULL DEFAULT 'endsem'
                    CHECK (type IN ('endsem','midsem','internal','practical','viva')),
  semester        VARCHAR(20)  DEFAULT '',
  program_id      VARCHAR(36)  REFERENCES programs(id) ON DELETE SET NULL,
  academic_year   VARCHAR(20)  NOT NULL DEFAULT '',
  start_date      DATE,
  end_date        DATE,
  status          VARCHAR(20)  NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','ongoing','evaluated','published')),
  published_at    TIMESTAMPTZ,
  published_by    VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  created_by      VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_examinations_updated_at ON examinations;
CREATE TRIGGER trg_examinations_updated_at
  BEFORE UPDATE ON examinations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS exam_papers (
  id               VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL DEFAULT 'Untitled Paper',
  subject          VARCHAR(255) DEFAULT '',
  course_id        VARCHAR(36)  REFERENCES courses(id) ON DELETE SET NULL,
  program          VARCHAR(255) DEFAULT '',
  semester         VARCHAR(100) DEFAULT '',
  total_marks      INTEGER      NOT NULL DEFAULT 0,
  examination_id   VARCHAR(36)  REFERENCES examinations(id) ON DELETE SET NULL,
  created_by       VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id             VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id       VARCHAR(36)  NOT NULL REFERENCES exam_papers(id) ON DELETE CASCADE,
  question_no    INTEGER      NOT NULL,
  question_text  TEXT         NOT NULL DEFAULT '',
  max_marks      INTEGER      NOT NULL DEFAULT 10,
  rubric         TEXT         DEFAULT '',
  sub_sections   JSONB        NOT NULL DEFAULT '[]',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (paper_id, question_no)
);



CREATE TABLE IF NOT EXISTS eval_sessions (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL DEFAULT 'Unnamed Session',
  subject     VARCHAR(255) DEFAULT '',
  max_marks   INTEGER      NOT NULL DEFAULT 100,
  paper_id    VARCHAR(36)  REFERENCES exam_papers(id) ON DELETE SET NULL,
  created_by  VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','completed','archived')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_results (
  id                    VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id              VARCHAR(36)   REFERENCES exam_papers(id) ON DELETE SET NULL,
  session_id            VARCHAR(36)   REFERENCES eval_sessions(id) ON DELETE SET NULL,
  student_id            VARCHAR(36)   REFERENCES students(id) ON DELETE SET NULL,

  student_name          VARCHAR(255)  NOT NULL DEFAULT '',
  roll_no               VARCHAR(100)  DEFAULT '',
  enrollment_no         VARCHAR(100)  DEFAULT '',

  total_marks_obtained  DECIMAL(7,2)  NOT NULL DEFAULT 0,
  max_marks             INTEGER       NOT NULL DEFAULT 0,
  percentage            DECIMAL(5,2)  NOT NULL DEFAULT 0,
  grade                 VARCHAR(5)    NOT NULL DEFAULT 'F'
                          CHECK (grade IN ('O','A+','A','B+','B','C','F')),

  transcription         TEXT          DEFAULT '',
  detailed_feedback     TEXT          DEFAULT '',
  strengths             JSONB         NOT NULL DEFAULT '[]',
  improvements          JSONB         NOT NULL DEFAULT '[]',
  comparison_notes      TEXT          DEFAULT '',
  teacher_note          TEXT          DEFAULT '',

  needs_review          BOOLEAN       NOT NULL DEFAULT FALSE,
  is_published          BOOLEAN       NOT NULL DEFAULT FALSE,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_student_results_updated_at ON student_results;
CREATE TRIGGER trg_student_results_updated_at
  BEFORE UPDATE ON student_results
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS question_responses (
  id                     VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id              VARCHAR(36)   NOT NULL REFERENCES student_results(id) ON DELETE CASCADE,
  question_no            INTEGER       NOT NULL,
  question_text          TEXT          DEFAULT '',
  marks_awarded          DECIMAL(7,2)  NOT NULL DEFAULT 0,
  max_marks              INTEGER       NOT NULL DEFAULT 0,
  feedback               TEXT          DEFAULT '',
  sub_section_responses  JSONB         NOT NULL DEFAULT '[]',
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS marksheets (
  id                VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
  examination_id    VARCHAR(36)   REFERENCES examinations(id) ON DELETE CASCADE,
  student_id        VARCHAR(36)   REFERENCES students(id) ON DELETE CASCADE,

  student_name      VARCHAR(255)  NOT NULL DEFAULT '',
  roll_no           VARCHAR(100)  DEFAULT '',
  enrollment_no     VARCHAR(100)  DEFAULT '',
  program           VARCHAR(255)  DEFAULT '',
  semester          VARCHAR(100)  DEFAULT '',
  academic_year     VARCHAR(20)   DEFAULT '',

  total_marks       INTEGER       NOT NULL DEFAULT 0,
  max_marks         INTEGER       NOT NULL DEFAULT 0,
  percentage        DECIMAL(5,2)  NOT NULL DEFAULT 0,
  overall_grade     VARCHAR(5)    NOT NULL DEFAULT 'F'
                      CHECK (overall_grade IN ('O','A+','A','B+','B','C','F')),
  result_status     VARCHAR(10)   NOT NULL DEFAULT 'PASS'
                      CHECK (result_status IN ('PASS','FAIL','ATKT','ABSENT')),

  verification_code VARCHAR(100)  NOT NULL UNIQUE,
  issued_by         VARCHAR(36)   REFERENCES users(id) ON DELETE SET NULL,
  issued_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  remarks           TEXT          DEFAULT ''
);

CREATE TABLE IF NOT EXISTS marksheet_subjects (
  id              VARCHAR(36)   PRIMARY KEY DEFAULT gen_random_uuid(),
  marksheet_id    VARCHAR(36)   NOT NULL REFERENCES marksheets(id) ON DELETE CASCADE,
  result_id       VARCHAR(36)   NOT NULL REFERENCES student_results(id) ON DELETE CASCADE,
  paper_id        VARCHAR(36)   REFERENCES exam_papers(id) ON DELETE SET NULL,
  subject_name    VARCHAR(255)  NOT NULL,
  course_code     VARCHAR(20)   DEFAULT '',
  marks_obtained  DECIMAL(7,2)  NOT NULL DEFAULT 0,
  max_marks       INTEGER       NOT NULL DEFAULT 0,
  grade           VARCHAR(5)    NOT NULL DEFAULT 'F'
                    CHECK (grade IN ('O','A+','A','B+','B','C','F')),
  credits         SMALLINT      NOT NULL DEFAULT 3,
  is_pass         BOOLEAN       NOT NULL DEFAULT TRUE
);



CREATE TABLE IF NOT EXISTS lms_resources (
  id           VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id    VARCHAR(36)  NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  type         VARCHAR(30)  NOT NULL DEFAULT 'pdf'
                 CHECK (type IN ('pdf','video','assignment','link','document','other')),
  url          TEXT         DEFAULT '',
  file_path    TEXT         DEFAULT '',
  uploaded_by  VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  uploader_name VARCHAR(255) DEFAULT '',   -- snapshot
  due_date     DATE,
  is_visible   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lms_announcements (
  id            VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     VARCHAR(36)  REFERENCES courses(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  content       TEXT         DEFAULT '',
  author_id     VARCHAR(36)  REFERENCES users(id) ON DELETE SET NULL,
  author_name   VARCHAR(255) DEFAULT '',   -- snapshot
  audience      VARCHAR(20)  NOT NULL DEFAULT 'all'
                  CHECK (audience IN ('all','faculty','students')),
  is_pinned     BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS notifications (
  id          VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(36)  REFERENCES users(id) ON DELETE CASCADE,
  student_id  VARCHAR(36)  REFERENCES students(id) ON DELETE CASCADE,
  type        VARCHAR(30)  NOT NULL DEFAULT 'info'
                CHECK (type IN ('info','success','warning','result','marksheet','announcement')),
  title       VARCHAR(255) NOT NULL,
  message     TEXT         DEFAULT '',
  link_page   VARCHAR(100) DEFAULT '',    -- e.g. 'student_portal', 'courses'
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_notif_target CHECK (
    (user_id IS NOT NULL) OR (student_id IS NOT NULL) OR
    (user_id IS NULL AND student_id IS NULL)  -- broadcast
  )
);

CREATE TABLE IF NOT EXISTS audit_log (
  id           BIGSERIAL    PRIMARY KEY,
  actor_type   VARCHAR(20)  NOT NULL CHECK (actor_type IN ('user','student','system')),
  actor_id     VARCHAR(36)  NOT NULL,
  actor_name   VARCHAR(255) DEFAULT '',
  action       VARCHAR(50)  NOT NULL,    -- CREATE, UPDATE, DELETE, LOGIN, PUBLISH
  table_name   VARCHAR(100) NOT NULL,
  record_id    VARCHAR(36),
  old_data     JSONB,
  new_data     JSONB,
  ip_address   INET,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);



CREATE INDEX IF NOT EXISTS idx_students_email      ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_dept       ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_program    ON students(program_id);
CREATE INDEX IF NOT EXISTS idx_students_batch      ON students(batch);
CREATE INDEX IF NOT EXISTS idx_students_status     ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_name_trgm
  ON students USING GIN ((first_name || ' ' || last_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_email         ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role          ON users(role);

CREATE INDEX IF NOT EXISTS idx_faculty_dept        ON faculty(department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_email       ON faculty(email);

CREATE INDEX IF NOT EXISTS idx_courses_dept        ON courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_code        ON courses(code);
CREATE INDEX IF NOT EXISTS idx_courses_semester    ON courses(semester);

CREATE INDEX IF NOT EXISTS idx_enroll_student      ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enroll_course       ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enroll_year         ON course_enrollments(academic_year);

CREATE INDEX IF NOT EXISTS idx_faccourse_faculty   ON faculty_courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faccourse_course    ON faculty_courses(course_id);

CREATE INDEX IF NOT EXISTS idx_questions_course    ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_type      ON questions(course_id, type, difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_co        ON questions(co);
CREATE INDEX IF NOT EXISTS idx_questions_blooms    ON questions(blooms);

CREATE INDEX IF NOT EXISTS idx_exams_program       ON examinations(program_id);
CREATE INDEX IF NOT EXISTS idx_exams_year          ON examinations(academic_year);
CREATE INDEX IF NOT EXISTS idx_exams_status        ON examinations(status);

CREATE INDEX IF NOT EXISTS idx_papers_exam         ON exam_papers(examination_id);
CREATE INDEX IF NOT EXISTS idx_papers_course       ON exam_papers(course_id);

CREATE INDEX IF NOT EXISTS idx_eqns_paper          ON exam_questions(paper_id);

CREATE INDEX IF NOT EXISTS idx_sessions_paper      ON eval_sessions(paper_id);

CREATE INDEX IF NOT EXISTS idx_results_paper       ON student_results(paper_id);
CREATE INDEX IF NOT EXISTS idx_results_student     ON student_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_published   ON student_results(student_id, is_published);
CREATE INDEX IF NOT EXISTS idx_results_session     ON student_results(session_id);

CREATE INDEX IF NOT EXISTS idx_qresp_result        ON question_responses(result_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_marksheets_code     ON marksheets(verification_code);
CREATE INDEX IF NOT EXISTS idx_marksheets_student         ON marksheets(student_id);
CREATE INDEX IF NOT EXISTS idx_marksheets_exam            ON marksheets(examination_id);
CREATE INDEX IF NOT EXISTS idx_msubjects_marksheet        ON marksheet_subjects(marksheet_id);

CREATE INDEX IF NOT EXISTS idx_resources_course    ON lms_resources(course_id);
CREATE INDEX IF NOT EXISTS idx_annc_course_time    ON lms_announcements(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_annc_audience       ON lms_announcements(audience);

CREATE INDEX IF NOT EXISTS idx_notif_user          ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_student       ON notifications(student_id, is_read);

CREATE INDEX IF NOT EXISTS idx_pcr_student         ON profile_change_requests(student_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_actor         ON audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_table         ON audit_log(table_name, record_id);



INSERT INTO departments (id, name, code) VALUES
  ('ITMDEP001', 'Computer Science & Engineering', 'CSE'),
  ('ITMDEP002', 'Business Management',            'MGT'),
  ('ITMDEP003', 'Electronics & Communication',    'ECE'),
  ('ITMDEP004', 'Mechanical Engineering',         'ME'),
  ('ITMDEP005', 'Basic Sciences',                 'SCI'),
  ('ITMDEP006', 'Law',                            'LAW')
ON CONFLICT (id) DO NOTHING;

INSERT INTO programs (id, name, short_name, department_id, duration_years, total_semesters) VALUES
  (gen_random_uuid(), 'B.Tech CSE',   'B.Tech',  'ITMDEP001', 4, 8),
  (gen_random_uuid(), 'B.Tech ECE',   'B.Tech',  'ITMDEP003', 4, 8),
  (gen_random_uuid(), 'B.Tech ME',    'B.Tech',  'ITMDEP004', 4, 8),
  (gen_random_uuid(), 'BBA',          'BBA',     'ITMDEP002', 3, 6),
  (gen_random_uuid(), 'MBA',          'MBA',     'ITMDEP002', 2, 4),
  (gen_random_uuid(), 'BCA',          'BCA',     'ITMDEP001', 3, 6),
  (gen_random_uuid(), 'MCA',          'MCA',     'ITMDEP001', 2, 4),
  (gen_random_uuid(), 'B.Sc (Hons)',  'B.Sc',    'ITMDEP005', 3, 6),
  (gen_random_uuid(), 'BA LLB',       'BA LLB',  'ITMDEP006', 5, 10),
  (gen_random_uuid(), 'LLM',          'LLM',     'ITMDEP006', 2, 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('USR-ADMIN-001', 'admin@itmuniversity.ac.in',
   crypt('admin123', gen_salt('bf', 10)),
   'Administrator', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('USR-FAC-001', 'faculty@itmuniversity.ac.in',
   crypt('faculty123', gen_salt('bf', 10)),
   'Dr. Amit Kumar', 'faculty')
ON CONFLICT (id) DO NOTHING;

INSERT INTO faculty (id, user_id, name, email, department_id, designation, specialization) VALUES
  ('ITMFAC001', 'USR-FAC-001', 'Dr. Amit Kumar',   'faculty@itmuniversity.ac.in', 'ITMDEP001', 'Professor',           'AI, Machine Learning'),
  ('ITMFAC002', NULL,           'Dr. Rajesh Verma', 'rajesh.v@itmuniversity.ac.in','ITMDEP002', 'Associate Professor', 'Finance, Marketing'),
  ('ITMFAC003', NULL,           'Dr. S.K. Jain',    'sk.jain@itmuniversity.ac.in', 'ITMDEP003', 'Professor',           'VLSI, Embedded Systems'),
  ('ITMFAC004', NULL,           'Dr. P.K. Sharma',  'pk.sharma@itmuniversity.ac.in','ITMDEP004','Associate Professor', 'Thermal Engineering'),
  ('ITMFAC005', NULL,           'Dr. Anjali Gupta', 'anjali.g@itmuniversity.ac.in','ITMDEP005', 'Assistant Professor', 'Mathematics, Statistics'),
  ('ITMFAC006', NULL,           'Dr. Vikram Singh', 'vikram.s@itmuniversity.ac.in', 'ITMDEP006', 'Professor',           'Constitutional Law')
ON CONFLICT (id) DO NOTHING;

UPDATE departments SET hod_id = 'ITMFAC001' WHERE id = 'ITMDEP001';
UPDATE departments SET hod_id = 'ITMFAC002' WHERE id = 'ITMDEP002';
UPDATE departments SET hod_id = 'ITMFAC003' WHERE id = 'ITMDEP003';
UPDATE departments SET hod_id = 'ITMFAC004' WHERE id = 'ITMDEP004';
UPDATE departments SET hod_id = 'ITMFAC005' WHERE id = 'ITMDEP005';
UPDATE departments SET hod_id = 'ITMFAC006' WHERE id = 'ITMDEP006';

INSERT INTO students (id, enrollment_no, first_name, last_name, email, department_id, program_id, batch, category, father_name, status) VALUES
  ('ITM2024001', 'EN2024001', 'Aditya',  'Sharma', 'aditya.s@itmuniversity.ac.in',
    'ITMDEP001',
    (SELECT id FROM programs WHERE name = 'B.Tech CSE'),
    '2024-2028', 'General', 'Mr. Suresh Sharma', 'active'),

  ('ITM2024002', 'EN2024002', 'Priya',   'Singh',  'priya.s@itmuniversity.ac.in',
    'ITMDEP002',
    (SELECT id FROM programs WHERE name = 'BBA'),
    '2024-2027', 'OBC', 'Mr. Mohan Singh', 'active'),

  ('ITM2024003', 'EN2024003', 'Rahul',   'Gupta',  'rahul.g@itmuniversity.ac.in',
    'ITMDEP001',
    (SELECT id FROM programs WHERE name = 'B.Tech CSE'),
    '2024-2028', 'General', 'Mr. Ramesh Gupta', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (id, code, name, department_id, credits, type, max_students, semester, description) VALUES
  ('ITMCRS001', 'CSE301', 'Data Structures & Algorithms',  'ITMDEP001', 4, 'Core',     60, '4th', 'Advanced data structures, algorithm design, and complexity analysis.'),
  ('ITMCRS002', 'CSE402', 'Machine Learning',              'ITMDEP001', 3, 'Elective', 40, '6th', 'Introduction to machine learning concepts and practical applications.'),
  ('ITMCRS003', 'MGT201', 'Business Strategy',             'ITMDEP002', 3, 'Core',     50, '3rd', 'Strategic management concepts for modern businesses.'),
  ('ITMCRS004', 'CSE201', 'Object Oriented Programming',   'ITMDEP001', 4, 'Core',     60, '2nd', 'OOP principles using Java  classes, inheritance, polymorphism.'),
  ('ITMCRS005', 'CSE501', 'Database Management Systems',   'ITMDEP001', 4, 'Core',     60, '5th', 'Relational databases, SQL, normalization, and transaction management.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO faculty_courses (faculty_id, course_id, academic_year, semester_label) VALUES
  ('ITMFAC001', 'ITMCRS001', '2024-25', 'ODD'),
  ('ITMFAC001', 'ITMCRS002', '2024-25', 'EVEN'),
  ('ITMFAC002', 'ITMCRS003', '2024-25', 'ODD')
ON CONFLICT DO NOTHING;

INSERT INTO course_enrollments (student_id, course_id, academic_year) VALUES
  ('ITM2024001', 'ITMCRS001', '2024-25'),
  ('ITM2024001', 'ITMCRS004', '2024-25'),
  ('ITM2024003', 'ITMCRS001', '2024-25'),
  ('ITM2024003', 'ITMCRS005', '2024-25'),
  ('ITM2024002', 'ITMCRS003', '2024-25')
ON CONFLICT DO NOTHING;

INSERT INTO questions (id, course_id, course_code, course_name, type, topic, difficulty, co, po, blooms, text, options, correct, marks) VALUES
  ('Q001', 'ITMCRS001', 'CSE301', 'Data Structures & Algorithms',
    'mcq', 'Module 1 - Searching', 'easy', 'CO1', 'PO1', 'remember',
    'What is the time complexity of binary search?',
    '{"A":"O(1)","B":"O(log n)","C":"O(n)","D":"O(n)"}', 'B', 1),

  ('Q002', 'ITMCRS001', 'CSE301', 'Data Structures & Algorithms',
    'short', 'Module 2 - Stacks', 'medium', 'CO2', 'PO2', 'apply',
    'Explain the working of a stack data structure with a real-life example.',
    NULL, NULL, 5),

  ('Q003', 'ITMCRS001', 'CSE301', 'Data Structures & Algorithms',
    'long', 'Module 3 - Trees', 'hard', 'CO3', 'PO3', 'analyze',
    'Compare and contrast Binary Search Tree, AVL Tree, and Red-Black Tree in terms of structure, balancing strategy, and time complexity.',
    NULL, NULL, 10),

  ('Q004', 'ITMCRS001', 'CSE301', 'Data Structures & Algorithms',
    'mcq', 'Module 1 - Sorting', 'medium', 'CO1', 'PO1', 'understand',
    'Which sorting algorithm has the best average-case time complexity?',
    '{"A":"Bubble Sort","B":"Insertion Sort","C":"Merge Sort","D":"Selection Sort"}', 'C', 1),

  ('Q005', 'ITMCRS001', 'CSE301', 'Data Structures & Algorithms',
    'numerical', 'Module 4 - Graphs', 'hard', 'CO4', 'PO3', 'apply',
    'Apply Dijkstra''s algorithm on the given graph and find the shortest path from vertex A to all other vertices.',
    NULL, NULL, 8)
ON CONFLICT (id) DO NOTHING;



CREATE OR REPLACE VIEW v_students AS
  SELECT
    s.id, s.enrollment_no, s.first_name, s.last_name,
    s.first_name || ' ' || s.last_name AS full_name,
    s.email, s.phone, s.whatsapp,
    s.gender, s.date_of_birth, s.nationality, s.blood_group,
    s.batch, s.category, s.status,
    d.name  AS department_name,
    d.code  AS department_code,
    p.name  AS program_name,
    s.father_name, s.mother_name,
    s.permanent_address, s.local_address,
    s.hobbies, s.career_options, s.achievements,
    s.linkedin, s.github,
    s.created_at
  FROM students s
  LEFT JOIN departments d ON s.department_id = d.id
  LEFT JOIN programs    p ON s.program_id    = p.id;

CREATE OR REPLACE VIEW v_faculty AS
  SELECT
    f.id, f.name, f.email, f.phone,
    f.designation, f.specialization, f.qualification, f.experience_years,
    d.name AS department_name, d.code AS department_code,
    f.is_active, f.created_at
  FROM faculty f
  LEFT JOIN departments d ON f.department_id = d.id;

CREATE OR REPLACE VIEW v_courses AS
  SELECT
    c.id, c.code, c.name, c.credits, c.type, c.semester,
    c.max_students, c.description, c.is_active,
    d.name AS department_name,
    COUNT(DISTINCT ce.student_id) AS enrolled_count,
    STRING_AGG(DISTINCT f.name, ', ') AS faculty_names
  FROM courses c
  LEFT JOIN departments      d   ON c.department_id = d.id
  LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'enrolled'
  LEFT JOIN faculty_courses   fc  ON c.id = fc.course_id AND fc.is_active = TRUE
  LEFT JOIN faculty           f   ON fc.faculty_id = f.id
  GROUP BY c.id, c.code, c.name, c.credits, c.type, c.semester,
           c.max_students, c.description, c.is_active, d.name;

CREATE OR REPLACE VIEW v_published_results AS
  SELECT
    sr.id, sr.student_id, sr.student_name, sr.roll_no,
    sr.total_marks_obtained, sr.max_marks, sr.percentage, sr.grade,
    sr.detailed_feedback, sr.strengths, sr.improvements,
    sr.needs_review, sr.created_at,
    ep.title AS paper_title, ep.subject, ep.semester,
    e.title  AS examination_title, e.type AS examination_type,
    e.academic_year, e.published_at
  FROM student_results sr
  LEFT JOIN exam_papers  ep ON sr.paper_id       = ep.id
  LEFT JOIN examinations e  ON ep.examination_id = e.id
  WHERE sr.is_published = TRUE;

CREATE OR REPLACE VIEW v_marksheet_full AS
  SELECT
    m.id AS marksheet_id,
    m.verification_code,
    m.student_name, m.roll_no, m.enrollment_no,
    m.program, m.semester, m.academic_year,
    m.total_marks, m.max_marks, m.percentage,
    m.overall_grade, m.result_status,
    m.issued_at,
    e.title AS examination_title, e.type AS examination_type,
    ms.subject_name, ms.course_code,
    ms.marks_obtained, ms.max_marks AS subject_max,
    ms.grade AS subject_grade, ms.credits, ms.is_pass
  FROM marksheets m
  JOIN examinations      e  ON m.examination_id = e.id
  JOIN marksheet_subjects ms ON m.id = ms.marksheet_id
  ORDER BY m.id, ms.subject_name;

CREATE OR REPLACE VIEW v_co_attainment AS
  SELECT
    q.course_id,
    q.course_code,
    q.co,
    q.po,
    q.blooms,
    COUNT(qr.id)                                    AS responses_count,
    ROUND(AVG(qr.marks_awarded / NULLIF(qr.max_marks, 0) * 100), 2) AS avg_attainment_pct
  FROM question_responses qr
  JOIN exam_questions  eq ON qr.question_no = eq.question_no
                         AND eq.paper_id IN (
                           SELECT id FROM exam_papers
                           WHERE course_id = q.course_id
                         )
  JOIN questions q ON q.course_code = eq.question_text  -- approximate; improve with FK
  WHERE qr.max_marks > 0
  GROUP BY q.course_id, q.course_code, q.co, q.po, q.blooms;



CREATE OR REPLACE FUNCTION grade_from_pct(pct DECIMAL)
RETURNS VARCHAR(5) AS $$
BEGIN
  IF    pct >= 90 THEN RETURN 'O';
  ELSIF pct >= 80 THEN RETURN 'A+';
  ELSIF pct >= 70 THEN RETURN 'A';
  ELSIF pct >= 60 THEN RETURN 'B+';
  ELSIF pct >= 50 THEN RETURN 'B';
  ELSIF pct >= 40 THEN RETURN 'C';
  ELSE                  RETURN 'F';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION publish_examination(exam_id VARCHAR(36), admin_user_id VARCHAR(36))
RETURNS INTEGER AS $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE student_results
  SET    is_published = TRUE, updated_at = NOW()
  WHERE  paper_id IN (
           SELECT id FROM exam_papers WHERE examination_id = exam_id
         );
  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  UPDATE examinations
  SET    status = 'published', published_at = NOW(), published_by = admin_user_id
  WHERE  id = exam_id;

  RETURN rows_updated;
END;
$$ LANGUAGE plpgsql;



COMMIT;

SELECT tablename
FROM   pg_tables
WHERE  schemaname = 'public'
ORDER  BY tablename;

