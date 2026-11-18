# TAP2 Coach – neue App (Branch `dev`)

> Kostenlos betreibbare Nachfolgerin der Live-App (`index.html` auf `main`): statische, lokal-first PWA mit
> Vite, React 19, TypeScript, TanStack Router, Zustand und Zod. Lernstand-Format und Frage-IDs sind identisch
> mit der Live-App. Aufbau, Stack-Entscheidung und Portierungsstand: [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md),
> Start und Deploy: [docs/ENTWICKLUNG.md](docs/ENTWICKLUNG.md).

```sh
npm install && npm run dev
```

## Lernbereiche

Im Kopfbereich kann zwischen **FIAE** und **FISI** gewechselt werden. Der gewählte Bereich bleibt auf diesem Gerät
gespeichert; beide Bereiche verwenden getrennte Frage-IDs und behalten ihren jeweiligen Lernfortschritt. FIAE bleibt
der Standard. FISI startet mit über 400 eigenständig formulierten Fragen aus den vier Prüfungsbereichen; die
redaktionellen Fragen liegen in `src/content/fisi.json` und `src/content/fisi-bank.ts`.
Die bereitgestellten Originalprüfungen und Lösungshinweise werden nicht in die öffentliche App übernommen.

Der Prüfungstermin lässt sich unter Einstellungen passend zum Winter-/Sommertermin wählen oder individuell aus der
persönlichen Einladung setzen; diese Auswahl wird lokal in diesem Browser gespeichert.

Für FISI sind derzeit noch keine größeren Übungsaufgaben, Prüfungssimulationen, Events oder Tutor-Inhalte hinterlegt.
