# Project rules

- This app lives on branch `dev` only; never touch the live app (`../index.html`, branch `main`). See `docs/ARCHITEKTUR.md`.
- Styling uses Tailwind v4 via `@tailwindcss/vite`, loading `tailwind.config.ts` through `@config` in `src/styles.css`; colors come from `src/theme/tokens.css`. UI components come from `@/ui` (own kit). Never add company design systems, proprietary fonts or brand assets — the repo is public.
- Catalog content lives in `src/content/catalogs/` (schema 1, see docs). Item ids are stable progress keys and must never be renumbered.
- AI provider is `src/lib/ai-provider.server.ts`; AI access is server-side allowlisted by Supabase user id (`TUTOR_ALLOWED_USER_IDS`, fail-closed). Security checklist: `docs/ENTWICKLUNG.md`.
- AI tutor logic lives in `src/lib/agent.server.ts` (server-only, imported dynamically inside server functions in `src/lib/learn.functions.ts`) so prompts and model calls never reach the browser.
- The tutor returns one strict JSON turn (reply, phase, plan, learner model, propositions, optional diagram/demo); keep the provider schema and runtime tutor contract in sync.
- Persist each tutor task and its self-contained Markdown material inside the associated message using the shared quest codec; legacy messages remain readable so reopening never loses task context.
- Separate pedagogical replies from quest-only assignments at generation and presentation; historical message data and learner evidence remain unchanged.
- Tutor and grading outputs are validated through the shared tutor contract; enforce diagnosis → plan → teach → transfer, with verbatim learner evidence before graph writes or step advancement, so model output cannot silently skip learning stages.
- Grading persists its learner answer, feedback, and tailored plan in an ordinary owner-scoped tutor session; handoff resumes that session instead of discarding assessment context.
- Tutor entry points reuse owner-scoped saved sessions by exact goal or curriculum topic before creating a new path; explicit new conversations bypass reuse so navigation never resets progress.
- Keep the tutor workspace at /dashboard, learning sources and curriculum at /lernplan, and searchable saved conversations at /verlauf to separate learning, reference material, and retrieval.
- Store personal learning sources owner-scoped, inject relevant text/files as untrusted tutor reference material, and never convert imports into mastery evidence.
- Derive category/topic graph scaffolding from the static exam curriculum without persisting it as learner propositions, so an empty evidence graph still has navigable structure.
- Knowledge graph = `propositions` (nodes) + `proposition_links` (premise → conclusion); all tables are owner-only via RLS on `user_id`.
- User files and generated diagrams live in the private `attachments` bucket under `<user_id>/...`; the browser reads them through signed URLs.

- TAP2 exam content (topics, cards, MC, open questions, exercises) is static JSON in `src/content/tap2.json`, extracted from the tap2-coach prototype; item ids (`k:<deck><n>`, `m<i>`, `o<i>`) are stable keys for `item_progress`, never renumber.
- Spaced repetition lives in `src/lib/tap2.ts` (`nextState`, `buildRound`) with tests in `src/lib/tap2.test.ts`.
- Curriculum and adaptive exam-date scheduling are pure functions in `src/lib/curriculum.ts`; tests keep topic ordering, prerequisite coverage, and learner-state priorities explicit.
- Execute Python (Pyodide) and SQL (SQLite/sql.js) only in a browser Web Worker, lazily started by the editor; locally served runtime files avoid external scripts and blocking the UI.
- Root hydration clears legacy theme storage and the dark class.
