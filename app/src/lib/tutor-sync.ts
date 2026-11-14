/**
 * Tutor-Stand auf allen Geräten: Ende-zu-Ende-verschlüsselt in app_tutor_state (supabase/003_app_tutor_state.sql).
 *
 * - Schlüssel: der vorhandene Sync-Schlüssel des Geräts (Geräte-Sync tap2_sync, sonst Konto-Sync) – seal/unseal/aesKey aus
 *   crypto.ts, gleiches Verfahren wie der übrige Sync. Der Server sieht nur den verschlüsselten Text und eine Prüfsumme
 *   des Schlüssels (kid), nie den Schlüssel.
 * - Ablauf wie app_sync: holen → entschlüsseln → normalizeTutor (Fremddaten) → mergeTutor → bei Änderung verschlüsselt
 *   zurückschreiben (Versionsprüfung; war ein anderes Gerät schneller, wird erneut zusammengeführt).
 * - Anderer Schlüssel in der Cloud (kid passt nicht): nichts überschreiben, Hinweis zeigen; ersetzen nur auf Wunsch (force).
 * Rein bis auf die übergebenen Abhängigkeiten (rpc, Schlüssel) – getestet mit einem Schein-Server in tutor-sync.test.ts.
 */
import { aesKey, keyRaw, seal, unseal } from "./crypto";
import { mergeTutor, normalizeTutor, type Known, type TutorState } from "./tutor-state";
import { stab } from "./gami/state";

export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
type Row = { ok?: boolean; rev?: number; kid?: string; blob?: string; gone?: boolean } | null;
export type SyncResult = { state: TutorState; rev: number; changed: boolean; pushed: boolean; mismatch?: boolean };

const te = new TextEncoder();
/** Prüfsumme des Schlüssels (16 Hex-Zeichen) – erkennt einen fremden Stand, verrät den Schlüssel nicht */
export async function tutorKid(key: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode("tap2-tutor-kid|" + keyRaw(key))));
  return [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const open = async (blob: string, aes: CryptoKey, known: Known) => {
  const o = (await unseal(blob, aes)) as { kind?: string; st?: unknown };
  if (!o || o.kind !== "tutor") throw new Error("Unbekannter Inhalt in der Cloud.");
  return normalizeTutor(o.st, known);
};

/** Einmal abgleichen. local = aktueller Stand auf dem Gerät, rev = zuletzt bekannte Version. */
export async function syncTutor(rpc: Rpc, key: string, local: TutorState, rev: number, known: Known, force = false): Promise<SyncResult> {
  const aes = await aesKey(key), kid = await tutorKid(key);
  let row = (await rpc("app_tutor_state_pull", {})) as Row, state = local, base = rev, changed = false;
  for (let tries = 0; tries < 4; tries++) {
    if (row?.blob && row.kid !== kid && !force) return { state: local, rev, changed: false, pushed: false, mismatch: true };
    let remote: TutorState | null = null;
    if (row?.blob && row.kid === kid) { remote = await open(row.blob, aes, known); base = +(row.rev ?? 0) || 0; }
    else base = row?.blob ? +(row.rev ?? 0) || 0 : 0;
    if (remote) { const m = mergeTutor(state, remote); if (stab(m) !== stab(state)) changed = true; state = m; }
    if (remote && stab(remote) === stab(state)) return { state, rev: base, changed, pushed: false };
    const res = (await rpc("app_tutor_state_push", { p_base: base, p_kid: kid, p_blob: await seal({ v: 1, kind: "tutor", st: state }, aes), p_force: force })) as Row;
    if (res?.ok) return { state, rev: +(res.rev ?? 0), changed, pushed: true };
    if (res?.gone) { row = null; continue; }
    if (res && res.kid && res.kid !== kid && !force) return { state, rev, changed, pushed: false, mismatch: true };
    row = res; // anderes Gerät war schneller: dessen Stand einmischen und erneut versuchen
  }
  throw new Error("Abgleich des Tutor-Stands gerade nicht möglich.");
}
