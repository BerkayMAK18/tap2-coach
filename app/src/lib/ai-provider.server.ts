/**
 * KI-Anbindung des Tutors (nur serverseitig).
 *
 * Die Vorlage „learnlab“ rief das Lovable AI Gateway auf (`generateResponse`, `generateImage` mit dem
 * Format der OpenAI-Responses-API). Diese Datei ersetzt das Gateway mit derselben Schnittstelle, damit
 * `agent.server.ts` unverändert bleibt.
 *
 * Stand Phase 0: noch kein Anbieter angebunden. Jeder Aufruf wirft einen verständlichen Fehler; der Rest
 * der App (Lernrunden, Lernquellen, Graph-Ansicht) funktioniert ohne KI.
 *
 * Phase 3 (geplant):
 * - Anbieter: Claude API (Anthropic) über `fetch`, Schlüssel als Cloudflare-Secret `ANTHROPIC_API_KEY`.
 * - Zugriff nur für freigeschaltete Konten: GitHub-Nutzer-IDs in `TUTOR_ALLOWED_GITHUB_IDS`
 *   (kommagetrennt), geprüft in `assertTutorAllowed` bevor ein Modell aufgerufen wird.
 * - Tageslimit pro Konto, damit Kosten planbar bleiben.
 * - Antwortformat in das bestehende Responses-Format übersetzen (output[].content[].text), damit
 *   `tutorTurnSchema` & Co. weiter greifen.
 */

export class TutorNotConfiguredError extends Error {
  constructor() {
    super("Der KI-Tutor ist in dieser Version noch nicht angebunden (geplant für Phase 3). Lernrunden und Lernquellen funktionieren ohne ihn.");
    this.name = "TutorNotConfiguredError";
  }
}

/** Freigabeliste prüfen (Phase 3). Erwartet die GitHub-Nutzer-ID aus dem Supabase-Profil. */
export function assertTutorAllowed(githubUserId: string | null | undefined): void {
  const allowed = (process.env["TUTOR_ALLOWED_GITHUB_IDS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!githubUserId || !allowed.includes(String(githubUserId))) {
    throw new Error("Der KI-Tutor ist für dein Konto noch nicht freigeschaltet.");
  }
}

// Schnittstelle wie in der Vorlage; Typen bewusst offen, bis der Anbieter feststeht.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateResponse(_request: any): Promise<any> {
  throw new TutorNotConfiguredError();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateImage(_request: any): Promise<any> {
  throw new TutorNotConfiguredError();
}
