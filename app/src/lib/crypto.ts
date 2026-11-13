/**
 * Ende-zu-Ende-Verschlüsselung für den Sync – Verfahren und Formate 1:1 wie in der Live-App (bewährt):
 * - Sync-Schlüssel: 160 Bit Zufall, Crockford-Base32 in 4er-Gruppen (z. B. „K7P4-…“), entsteht im Browser.
 * - AES-GCM-256 mit Schlüssel = SHA-256("tap2-enc|" + Schlüssel). Der Server sieht nur „1.<iv>.<ciphertext>“.
 * - Inhalt vor dem Verschlüsseln mit deflate komprimiert (falls der Browser es kann).
 * Der Schlüssel verlässt das Gerät nie Richtung Server.
 */
const te = new TextEncoder(), td = new TextDecoder();
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const b64u = {
  enc: (u8: Uint8Array) => { let x = ""; for (let i = 0; i < u8.length; i += 0x8000) x += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(x).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
  dec: (t: string) => { t = t.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; const x = atob(t), u = new Uint8Array(x.length); for (let i = 0; i < x.length; i++) u[i] = x.charCodeAt(i); return u; },
};
export const keyRaw = (s: string) => String(s || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
export const keyFmt = (raw: string) => (raw.match(/.{1,4}/g) ?? []).join("-");
export const isKey = (raw: string) => raw.length === 32 && [...raw].every((c) => B32.includes(c));

export function newSyncKey(): string {
  const r = crypto.getRandomValues(new Uint8Array(20)); let bits = 0, v = 0, out = "";
  r.forEach((b) => { v = ((v << 8) | b) & 0xffff; bits += 8; while (bits >= 5) { out += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } });
  return keyFmt(out);
}

async function sha(s: string) { return new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode(s))); }
export async function aesKey(key: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", await sha("tap2-enc|" + keyRaw(key)), "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function deflate(u8: Uint8Array, inflate = false): Promise<Uint8Array | null> {
  if (typeof CompressionStream === "undefined") return null;
  const st = inflate ? new DecompressionStream("deflate-raw") : new CompressionStream("deflate-raw");
  const out = new Response(new Blob([u8 as BlobPart]).stream().pipeThrough(st));
  return new Uint8Array(await out.arrayBuffer());
}

export async function seal(obj: unknown, aes: CryptoKey): Promise<string> {
  const raw = te.encode(JSON.stringify(obj)), z = await deflate(raw), body = new Uint8Array(1 + (z || raw).length);
  body[0] = z ? 1 : 0; body.set(z || raw, 1);
  const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, body));
  return "1." + b64u.enc(iv) + "." + b64u.enc(ct);
}
export async function unseal(blob: string, aes: CryptoKey): Promise<unknown> {
  const [v, iv, ct] = String(blob).split(".");
  if (v !== "1" || !iv || !ct) throw new Error("Unbekanntes Format in der Cloud.");
  const body = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64u.dec(iv) }, aes, b64u.dec(ct)));
  const data = body[0] ? await deflate(body.subarray(1), true) : body.subarray(1);
  if (!data) throw new Error("Dieser Browser kann den Stand nicht entpacken.");
  return JSON.parse(td.decode(data));
}
