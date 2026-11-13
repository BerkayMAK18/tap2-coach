# Entwicklung und Betrieb

## Voraussetzungen

- Node.js 22 oder neuer, npm.
- Kein Konto und keine Umgebungsvariablen nötig: Die Free-Version läuft komplett im Browser.

## Lokal starten

```sh
cd app
npm install
npm run dev        # http://localhost:8080
npm test           # Vitest: Kataloge, Lernstand, Wiederholungs-Engine
npm run build      # prüft Kataloge + TypeScript, baut nach dist/ (inkl. Service Worker)
npm run preview    # gebaute Version lokal ansehen (wie in Produktion, mit Offline-Modus)
```

## Inhalte aus der Live-App aktualisieren

```sh
npm run catalog:export
```

Liest `../index.html` (nur lesen) und schreibt `src/content/generated/`. Danach `npm test` – der Katalog-Test
prüft Format und Frage-IDs. `npm run build` bricht ab, wenn die Kataloge nicht mehr zur `index.html` passen.

## Deploy auf Cloudflare Pages (Free)

Einmalig im Cloudflare-Dashboard → Workers & Pages → Create → Pages → mit GitHub verbinden:

| Einstellung | Wert |
| --- | --- |
| Repository | `BerkayMAK18/tap2-coach` |
| Production branch | `dev` |
| Root directory | `app` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Umgebungsvariable | `NODE_VERSION` = `22` |

- Cloudflare baut danach bei jedem Push auf `dev` automatisch. Die Live-App (GitHub Pages, `main`) bleibt unberührt.
- `public/_headers` setzt Sicherheits-Header und CSP. Seiten ohne Datei liefert Pages automatisch als `index.html` aus (SPA).
- Kosten: Free-Plan, unbegrenzter statischer Traffic, 500 Builds/Monat.

## Sicherheit

Was der Code absichert:

| Schutz | Wo |
| --- | --- |
| Lernstand-Format wie Live-App; Fremddaten (Sicherung) werden auf Typen geprüft, echte Daten bleiben unverändert | `src/lib/state.ts` (+ Test) |
| Vor dem Laden einer Sicherung wird der alte Stand zurückgelegt (`tap2coach-vor-import`) | `src/store/progress.ts` |
| Keine Inline-Skripte; CSP erlaubt nur eigene Skripte, WebAssembly, Supabase und GitHub-API | `public/_headers` |
| Texte werden von React escaped; HTML nur für Abbildungen aus dem eigenen Katalog | `src/routes/lernen.runde.tsx` |
| Kataloge werden gegen ein Schema geprüft, bevor sie in die App kommen | `src/content/catalog.test.ts` |

Vor jedem Deploy: `npm test`, `npm run build`, `npm audit --omit=dev`.

Sobald Sync/Rangliste portiert sind (Supabase):
- [ ] eigenes Supabase-Projekt für dev, nicht das der Live-App
- [ ] Authentication: Registrierung neuer Nutzer und E-Mail-Provider aus (die App nutzt keine Konten)
- [ ] SQL aus `../tools/supabase-sync.sql` und `../tools/supabase-leaderboard.sql` einspielen
- [ ] nur den Publishable Key verwenden, nie `service_role`/`sb_secret`

## KI-Tutor (Phase 3, noch nicht eingebaut)

Der frühere Tutor-Code (learnlab) liegt in der Git-Historie (Commit `2909805`, u. a. `src/lib/agent.server.ts`).
Geplanter Wiedereinbau als eigenes Modul: ein Cloudflare Worker mit Claude API, Schlüssel als Secret,
Zugriff nur für Supabase-Nutzer-IDs auf einer Freigabeliste. Die Free-Version bleibt davon unabhängig.

## Supabase: Entscheidung 13.11.2026 – Live-Projekt mitbenutzen (Option B)

Der Free-Plan erlaubt nur 2 aktive Projekte. Die neue App nutzt deshalb **das Live-Projekt**, streng getrennt:

- Eigene Tabellen mit Präfix `app_` (z. B. `app_sync`, `app_sync_history`, `app_leaderboard`), RLS „nur eigene Zeile“
  (`user_id = auth.uid()`). Die Live-Tabellen `tap2_*` bleiben unverändert und gesperrt (keine Rechte für `anon`
  und `authenticated`, Zugriff nur über die bestehenden Funktionen).
- SQL der neuen App liegt getrennt in `app/supabase/*.sql` und darf nie `tap2_*`-Objekte ändern.
- Login: Provider **GitHub an**, „Allow new users to sign up“ **an** (nötig für GitHub-Konten), **E-Mail-Provider aus**,
  anonyme Anmeldung aus. Die Live-App nutzt keine Konten und ist davon nicht betroffen.
- Vor jedem SQL im Live-Projekt: lesen, was es ändert; nur `app_*`-Objekte; vorher Backup-Export der `tap2_*`-Tabellen
  ist nicht nötig, weil sie nicht berührt werden – trotzdem nie `drop`/`truncate` ohne Präfix-Prüfung.

### Einrichtung (von dir)
1. **GitHub-OAuth-App:** GitHub → Settings → Developer settings → OAuth Apps → New.
   Homepage: Adresse der Dev-App (vorerst `http://localhost:8080`), Callback: `https://<projekt>.supabase.co/auth/v1/callback`.
   Client-ID und Client-Secret notieren (Secret nie ins Repo).
2. **Supabase (Live-Projekt):** Authentication → Sign In / Providers → GitHub aktivieren, Client-ID/Secret eintragen;
   „Allow new users to sign up“ an; Email aus. Authentication → URL Configuration: `http://localhost:8080` und später
   die Cloudflare-Adresse als Redirect-URLs.
3. Danach (nächste Session): `app/supabase/` SQL für `app_*`, Login in der App, E2E-Sync, Rangliste, Konto löschen,
   dann Tutor Stufe 2 (`docs/TUTOR.md`).

### Stand 13.11.2026 (eingerichtet)
- Dev-App: **https://tap2-coach-dev.akdemir-berkay.workers.dev** (Cloudflare Workers, baut automatisch bei jedem Push auf `dev`,
  Root `/app`, `npm run build`, `npx wrangler deploy`, `NODE_VERSION=22`; Konfiguration `app/wrangler.jsonc`).
- Supabase (Live-Projekt): GitHub-Login an, Registrierung an, E-Mail/Telefon/anonym aus.
  Site URL = Dev-App; Redirect URLs: `https://tap2-coach-dev.akdemir-berkay.workers.dev/**`, `http://localhost:8080/**`.
- GitHub-OAuth-App „TAP2 Coach (dev)“ angelegt (Secret nur in Supabase).
