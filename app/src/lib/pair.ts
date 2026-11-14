/**
 * Gerät koppeln (syncPair/syncRedeem der Live-App): Ein 6-stelliger Kurzcode verschlüsselt den Sync-Schlüssel für
 * 10 Minuten auf dem Server. Der Server kennt nur eine Prüfsumme des Codes und den verschlüsselten Schlüssel.
 * Gleiches Verfahren wie die Live-App (PBKDF2 150 000 Runden, AES-GCM), damit Codes zwischen beiden Apps funktionieren.
 */
import { b64u, isKey, keyRaw } from "./crypto";

export const PAIR_AB = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Kurzcode: ohne 0/O und 1/I
export const newPairCode = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => PAIR_AB[b & 31]).join("");
export const codeFmt = (c: string) => c.slice(0, 3) + "-" + c.slice(3);
/** Eingabe auswerten: Sync-Schlüssel (32 Zeichen) oder Kurzcode (6 Zeichen aus PAIR_AB) */
export function parsePairInput(input: string): { key: string } | { code: string } | { err: string } {
  if (isKey(keyRaw(input))) return { key: input };
  const code = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6 || ![...code].every((c) => PAIR_AB.includes(c))) return { err: "Der Code hat 6 Zeichen, z. B. K7P-4QX." };
  return { code };
}
const te = new TextEncoder(), td = new TextDecoder();
const hexOf = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
export const pairHash = async (code: string) => hexOf(await crypto.subtle.digest("SHA-256", te.encode("tap2-pair|" + code)));
async function pairKey(code: string) {
  const base = await crypto.subtle.importKey("raw", te.encode(code), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: te.encode("tap2-pair"), iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
/** Sync-Schlüssel mit dem Kurzcode verschlüsseln → „iv.ct“ */
export async function pairSeal(key: string, code: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await pairKey(code), te.encode(key)));
  return b64u.enc(iv) + "." + b64u.enc(ct);
}
/** „iv.ct“ mit dem Kurzcode öffnen; liefert nur einen gültigen Sync-Schlüssel, sonst Fehler */
export async function pairOpen(payload: string, code: string) {
  const [iv, ct] = String(payload).split(".");
  const key = td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64u.dec(iv) }, await pairKey(code), b64u.dec(ct)));
  if (!isKey(keyRaw(key))) throw new Error("format");
  return key;
}
