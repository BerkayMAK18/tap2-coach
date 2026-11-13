# Entwicklung und Einrichtung

## Voraussetzungen

- Node.js 22 oder neuer, npm.
- Für Daten/Anmeldung: ein **eigenes** Supabase-Projekt für dev (nicht das der Live-App).
- Für das Hosting: ein Cloudflare-Konto.

## Lokal starten

```sh
cd app
npm install
npm run dev        # kopiert vorher die Python/SQL-Laufzeiten, startet auf http://localhost:8080
npm test           # Vitest
npm run build      # Cloudflare-Worker-Build nach dist/
```

## Umgebungsvariablen

In `app/.env.local` (wird nicht committet, siehe `.gitignore`):

| Variable | Wo | Inhalt |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser + Server | URL des Dev-Supabase-Projekts |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser + Server | Publishable/anon Key (öffentlich, durch RLS geschützt) |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` | Server | dieselben Werte für Server-Funktionen |
| `TUTOR_ALLOWED_USER_IDS` | Server | kommagetrennte **Supabase**-Nutzer-IDs (UUID) mit KI-Zugriff; leer = niemand |
| `ANTHROPIC_API_KEY` | Server (Phase 3) | nur als Cloudflare-Secret (`wrangler secret put`) |

**Nie** einen `service_role`- oder `sb_secret`-Schlüssel in die App oder ins Repo.

## Supabase-Dev-Projekt einrichten

1. Neues Projekt anlegen (z. B. „tap2-coach-dev“).
2. Schema einspielen: `drizzle/migrations/0000…0003*.sql` der Reihe nach im SQL-Editor ausführen.
   `0003_security_hardening.sql` ist Pflicht (privater Speicher, Rechte, Limits).
3. URL und Publishable Key in `.env.local` eintragen.

## GitHub-Anmeldung

1. GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*.
   - Homepage URL: Adresse der Dev-App (lokal `http://localhost:8080`).
   - Authorization callback URL: `https://<projekt>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → GitHub: Client ID und Client Secret eintragen.
3. Supabase → Authentication → URL Configuration: Dev-Adresse und `http://localhost:8080/auth` als Redirect-URLs erlauben.

Die App leitet nach der Anmeldung auf `/auth` zurück (`redirectTo` in `src/routes/auth.tsx`).

## Sicherheit (Pflicht vor dem ersten Deploy)

Ergebnis des Security-Checks vom 13.11.2026. Diese Einstellungen liegen **nicht** im Code und müssen im
Supabase-Dashboard gesetzt werden:

- [ ] **Authentication → Providers → Email: deaktivieren.** Die App bietet nur GitHub an, aber ohne diese
      Einstellung könnte man sich direkt über die Supabase-API mit E-Mail registrieren.
- [ ] **Authentication → Sign In / Providers → Anonymous sign-ins: aus** (Standard).
- [ ] **Authentication → URL Configuration:** nur die Dev-Adresse und `http://localhost:8080` als Redirect erlauben, keine Wildcards auf fremde Domains.
- [ ] **Storage → attachments: „Public bucket“ aus.** Migration 0003 setzt das, bitte kontrollieren.
- [ ] **Database → Advisors (Security Advisor):** keine Warnungen zu RLS offen.
- [ ] `TUTOR_ALLOWED_USER_IDS` nur mit deiner eigenen Nutzer-ID setzen.

Was der Code absichert (zum Nachlesen):

| Schutz | Wo |
| --- | --- |
| Jede Tabelle nur für den Besitzer (RLS), anon ohne Rechte | `drizzle/migrations/0000`–`0003` |
| Anhänge privat, nur erlaubte Typen (kein SVG/HTML), max. 10 MB, Zugriff per signierter URL | Migration 0003, `src/lib/queries.ts` |
| Server-Funktionen prüfen das JWT und nutzen den Nutzer-Client (kein `service_role` im Code) | `src/integrations/supabase/auth-middleware.ts` |
| KI-Aufrufe nur für freigeschaltete Nutzer-IDs, fail-closed | `src/lib/ai-provider.server.ts`, `src/lib/learn.functions.ts` |
| Laufzeitprüfung aller Eingaben, Dateipfade nur im eigenen Ordner | `src/lib/learn.functions.ts`, `storagePathSchema` in `src/lib/learn-types.ts` |
| Nur GitHub-Login (PKCE), kein Open Redirect nach der Anmeldung | `src/routes/auth.tsx`, `src/lib/safe-redirect.ts` |
| KI-Inhalte: kein HTML im Markdown, keine externen Bilder, Demos in Sandbox ohne Netzwerk | `src/components/learn/Markdown.tsx`, `session.$sessionId.tsx` |
| Sicherheits-Header (Clickjacking, nosniff, HSTS …) | `src/integrations/security-headers.ts` |
| Keine Geheimnisse im Repo (`.env*`, `.dev.vars` ignoriert) | `.gitignore` |
| Abhängigkeiten: `npm audit --omit=dev` = 0 Funde | `package.json` (`overrides`) |

Bekannte Restpunkte: Für Skripte gibt es noch keine strikte CSP, weil TanStack Start Inline-Skripte braucht.
Das wird erst mit Nonces möglich. `npm audit` meldet außerdem `minimatch` in `typescript-eslint`. Das betrifft
nur das lokale Linting und nichts, was ausgeliefert wird. Eigener Code im Python/SQL-Editor läuft in einem
Web Worker der App-Origin; Code aus fremden Quellen sollte man dort nicht ungeprüft ausführen.

Vor jedem Deploy: `npm audit --omit=dev`, `npm test`, `npx tsc --noEmit`.

## Deploy auf Cloudflare (noch nicht eingerichtet)

- `npm run build`, dann `npx wrangler deploy` (Name in `wrangler.jsonc`).
- Variablen im Cloudflare-Dashboard bzw. per `wrangler secret put`.
- Nur aus dem Branch `dev`. Die GitHub Action der Live-App reagiert ausschließlich auf `main`.

## Kataloge aus der Live-App aktualisieren

```sh
npm run catalog:export
```

Liest `../index.html` (nur lesen) und schreibt `src/content/catalogs/`. Details: `docs/ARCHITEKTUR.md`.
