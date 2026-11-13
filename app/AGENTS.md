# Projektregeln (app/, Branch dev)

- This app lives on branch `dev` only; never touch the live app (`../index.html`, branch `main`). Architecture and porting status: `docs/ARCHITEKTUR.md`.
- Static, local-first PWA: Vite + React 19 + TypeScript + TanStack Router (file routes in `src/routes`, `routeTree.gen.ts` is generated) + Zustand + Zod + Vitest. No server code.
- Learning state format must stay identical to the live app (v7, key `tap2coach`). Any change needs a migration in `normalize()` and a test. Everything from outside goes through `normalize()`.
- Question ids are progress keys and must never change (`m<i>`, `k:<deck><i>` from 0, `o<i>`, `ev:<event>:<q>`). Content comes from `npm run catalog:export`; never edit `src/content/generated` by hand.
- Spaced repetition and round logic live in `src/lib/srs.ts` and must match the live app; keep tests in `srs.test.ts`.
- UI from `@/ui`, colors from `src/theme/tokens.css`. Never add company design systems, proprietary fonts or brand colors — the repo is public.
- Only insert HTML via `dangerouslySetInnerHTML` for figures from our own catalog; never for user or remote data.
- Code comments and UI text in German.
