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
| `CRON_SECRET` | Server | nur falls Cron-Endpunkte genutzt werden |
| `TUTOR_ALLOWED_GITHUB_IDS` | Server (Phase 3) | kommagetrennte GitHub-Nutzer-IDs mit Tutor-Zugriff |
| `ANTHROPIC_API_KEY` | Server (Phase 3) | nur als Cloudflare-Secret (`wrangler secret put`) |

**Nie** einen `service_role`- oder `sb_secret`-Schlüssel in die App oder ins Repo.

## Supabase-Dev-Projekt einrichten

1. Neues Projekt anlegen (z. B. „tap2-coach-dev“).
2. Schema einspielen: Inhalte von `drizzle/migrations/*.sql` der Reihe nach im SQL-Editor ausführen.
3. URL und Publishable Key in `.env.local` eintragen.

## GitHub-Anmeldung

1. GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*.
   - Homepage URL: Adresse der Dev-App (lokal `http://localhost:8080`).
   - Authorization callback URL: `https://<projekt>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Providers → GitHub: Client ID und Client Secret eintragen.
3. Supabase → Authentication → URL Configuration: Dev-Adresse und `http://localhost:8080/auth` als Redirect-URLs erlauben.

Die App leitet nach der Anmeldung auf `/auth` zurück (`redirectTo` in `src/routes/auth.tsx`).

## Deploy auf Cloudflare (noch nicht eingerichtet)

- `npm run build`, dann `npx wrangler deploy` (Name in `wrangler.jsonc`).
- Variablen im Cloudflare-Dashboard bzw. per `wrangler secret put`.
- Nur aus dem Branch `dev`. Die GitHub Action der Live-App reagiert ausschließlich auf `main`.

## Kataloge aus der Live-App aktualisieren

```sh
npm run catalog:export
```

Liest `../index.html` (nur lesen) und schreibt `src/content/catalogs/`. Details: `docs/ARCHITEKTUR.md`.
