# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start both Vite (port 5173) and Express (port 5000) concurrently
npm run server     # Express backend only
npm run build      # Production Vite build
npm run preview    # Preview production build
```

No test suite exists. Manual testing via browser is required for frontend changes.

## Architecture

**Stack**: React 18 + Vite (frontend) · Express 4 + Node.js (backend) · PostgreSQL (primary DB) · Socket.io (real-time)

### Dual-Store Pattern
Every route has two code paths — PostgreSQL when available, JSON file fallback otherwise:
```js
if (pgdb.ready) {
  // PostgreSQL path
} else {
  // db (server/db.js) — synchronous JSON file store at server/itm_lms_db.json
}
```
`pgdb.js` initialises the pool, runs `schema_clean.sql` idempotently at startup, then applies `ALTER TABLE` migrations inline in `pgdb.js` itself (not in the schema file). New columns should be added as `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` blocks in `pgdb.js`.

### Frontend SPA
No React Router. Navigation is a `page` string in `App.jsx` state. `navigate(pageName, extras)` sets the page; RBAC is enforced here by the `ALLOWED_PAGES` map. All views are in `src/views/`.

### Auth & RBAC
No JWT. The logged-in user object is stored in `localStorage` as `itm_user`. The frontend API client (`src/api/client.js`) reads it and sends three custom headers on every request:
- `x-user-id`, `x-user-role`, `x-user-name`

Backend middleware (`server/middleware/auth.js`) reads these headers. Use `requireRole(...)`, `requireAdmin`, `requireModerator`, or `requireAuth` to guard routes. Roles: `admin`, `faculty`, `moderator`, `student`.

### API Client
All backend calls go through `src/api/client.js` → exported `api` object. Add new route groups here. The `req()` helper handles JSON serialisation, error throwing, and auth headers automatically.

### Schema & Migrations
`server/schema_clean.sql` — canonical table definitions (idempotent `CREATE TABLE IF NOT EXISTS`). Apply new tables/columns either here (new tables) or as inline `ALTER TABLE IF NOT EXISTS` in `pgdb.js` init (additive column changes). Schema runs on every server start.

### AI Services
- **AI Evaluation** (exam grading): Gemini API called directly from `server/index.js` via Socket.io events. Uses `gemini-2.5-flash` by default (`GEMINI_MODEL` env var).
- **AI Tutor** (RAG chatbot): pipeline in `server/services/ai/` — chunking → embeddings (Gemini `gemini-embedding-001`) → cosine retrieval → prompt assembly → Gemini chat. Route at `server/routes/aiTutor.js`.
- **Syllabus Engine**: `server/routes/syllabus.js` + `server/services/ai/gemini.service.js`.

### Evaluation Flow
1. `Evaluation.jsx` sends answer-sheet images + rubric via Socket.io to the server.
2. Server calls Gemini with per-question evaluation prompts.
3. Results saved via two parallel paths: `POST /api/exams/results` (PostgreSQL with `paper_id`) and `POST /api/evaluations/results` (legacy store, no `paper_id`). `student_results.paper_id` is **nullable** — do not add a NOT NULL constraint.
4. Marksheet generation is in `src/views/evaluation/MarksheetsView.jsx` + `MarksheetPrint.jsx`.

### Result Management System (new)
A second result pipeline lives alongside the exam-evaluation flow:

- **`component_marks`** table — stores one row per (student, course, semester, academic_year, component). Unique constraint prevents duplicates; `is_locked = TRUE` prevents edits.
- **`result_components`** — master reference for Endterm / Midterm / Quiz / Assignment / Practical / Internal. Seeded on startup.
- **`marksheet_templates` + `marksheet_template_components`** — configurable weightage templates (must total 100%).
- **`generated_marksheets`** — metadata + path to PDFs saved in `server/uploads/marksheets/`.
- Routes: `POST /api/results/*` (CRUD + bulk CSV), `POST /api/marksheets/*` (templates + PDF generation).
- Services in `server/services/results/`: `grading.service.js`, `resultCalculation.service.js`, `marksheet.service.js`, `pdf.service.js` (pdfkit).
- Frontend pages: `ResultManagement` (page key `results`) — marks entry, view, bulk upload; `MarksheetBuilder` (page key `marksheets`, admin only) — template builder, preview, PDF generation, history.
- Faculty can enter/edit their own course marks; admin has full access; students can view their own marks.

### Key Environment Variables
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string; if absent, falls back to JSON store |
| `GEMINI_API_KEY` | Required for AI evaluation and AI Tutor |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash` |
| `PORT` | Express port (default 5000) |
| `JWT_SECRET` | Used only in `server/config/index.js`; auth currently uses header-based identity, not JWT |

### UI Conventions
- Inline styles dominate; Tailwind utility classes appear only for responsive breakpoints (`lg:ml-[260px]`, `hidden sm:inline`).
- Icons via RemixIcon CDN (`ri-*` class names).
- Shared UI primitives: `src/components/ui/Btn.jsx`, `Spin.jsx`, `Modal.jsx`.
- `GC` (gap/class helper) and `S` (style map) imported from `src/utils/helpers.js` and `src/views/evaluation/styles.js` respectively in evaluation views.
- Toast notifications: `useToast()` from `src/components/Toast.jsx`.
