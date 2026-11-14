# Projektregeln (app/, Branch dev)

- This app lives on branch `dev` only; never touch the live app (`../index.html`, branch `main`). Architecture and porting status: `docs/ARCHITEKTUR.md`.
- Static, local-first PWA: Vite + React 19 + TypeScript + TanStack Router (file routes in `src/routes`, `routeTree.gen.ts` is generated) + Zustand + Zod + Vitest. No server code.
- Learning state format must stay identical to the live app (v7, key `tap2coach`). Any change needs a migration in `normalize()` and a test. Everything from outside goes through `normalize()`.
- Question ids are progress keys and must never change (`m<i>`, `k:<deck><i>` from 0, `o<i>`, `ev:<event>:<q>`). Content comes from `npm run catalog:export`; never edit `src/content/generated` by hand.
- Spaced repetition and round logic live in `src/lib/srs.ts` and must match the live app; keep tests in `srs.test.ts`.
- Design = the live app's stylesheet (`src/theme/main.css`, global). Port views with the SAME markup/classes/texts as the live app's template strings (docs/PORTIERUNG.md, parity rules); shared pieces in `src/ui-main` (`Ic`, `Ring`, nav). `@/ui` + Tailwind only for not-yet-ported legacy views. Never add company design systems, proprietary fonts or brand colors (#08312A is replaced by #172033) — the repo is public.
- Rewards (XP, gacha, titles, leaderboard) live in `src/lib/gami/` + `src/store/gami.ts` + `src/components/gami/`; storage `tap2coach-gami`, pack format and item/title IDs must never change (sync with the live app, `tap2_lb`). Golden tests compare against the live app's original (`src/lib/gami/golden/original.js`, test-only) – keep them green.
- Only insert HTML via `dangerouslySetInnerHTML` for our own catalog content (figures, icons, reward figures from `lib/gami/art.ts`); never for user, AI or remote data (AI text → `SafeMarkdown`).
- Code comments and UI text in German.
