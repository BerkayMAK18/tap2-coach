/**
 * Patch Notes – die GitHub-Releases des Repos, neueste zuerst (pnGet, pnCmp, pnMd, pnLoad der Live-App).
 * Release-Texte sind Fremddaten: kein HTML, sondern eine kleine Struktur (Überschrift, Absatz, Listen, fett, kursiv),
 * aus der die Ansicht dasselbe DOM wie die Live-App aufbaut – alles als escapter React-Text.
 */
export const REPO = "BerkayMAK18/tap2-coach";
export const KEY_PN = "tap2coach-patch";
export type Release = { tag: string; name: string; url: string; date: string; body: string };
export type PnCache = { at: number; list: Release[] };

const str = (x: unknown) => (typeof x === "string" ? x : x == null ? "" : String(x));
/** Zwischenspeicher lesen (Format der Live-App); unbrauchbare Einträge werden verworfen */
export function pnParseCache(raw: string | null): PnCache | null {
  try {
    const o = JSON.parse(raw || "null");
    if (!o || !Array.isArray(o.list)) return null;
    const list = (o.list as unknown[]).filter((x): x is Record<string, unknown> => !!x && typeof x === "object").map((x) => ({ tag: str(x.tag), name: str(x.name), url: /^https:\/\/github\.com\//.test(str(x.url)) ? str(x.url) : `https://github.com/${REPO}/releases`, date: /^\d{4}-\d{2}-\d{2}$/.test(str(x.date)) ? str(x.date) : "", body: str(x.body) }));
    return { at: Number(o.at) || 0, list };
  } catch { return null; }
}
/** Antwort der GitHub-API → Releases (ohne Entwürfe). Datum aus „*Veröffentlicht am TT.MM.JJJJ*“, sonst published_at. */
export function pnFromApi(json: unknown): Release[] {
  if (!Array.isArray(json)) throw new Error("format");
  return json.filter((x) => x && typeof x === "object" && !x.draft).map((x) => {
    const body = str(x.body), m = body.match(/Veröffentlicht am (\d{1,2})\.(\d{1,2})\.(\d{4})/);
    return {
      tag: str(x.tag_name), name: str(x.name || x.tag_name).replace(/^v[\d.]+\s*[–-]\s*/, ""),
      url: /^https:\/\/github\.com\//.test(str(x.html_url)) ? str(x.html_url) : `https://github.com/${REPO}/releases`,
      date: m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : str(x.published_at).slice(0, 10),
      body: body.replace(/^\*Veröffentlicht am[^*]*\*\s*/, ""),
    };
  });
}
const pnVer = (t: string) => str(t).replace(/^v/, "").split(".").map((x) => +x || 0);
/** Neueste zuerst: nach Datum, bei gleichem Datum nach Versionsnummer */
export const pnCmp = (a: Release, b: Release) => (b.date || "").localeCompare(a.date || "") || pnVer(b.tag).reduce((r, x, i) => r || x - (pnVer(a.tag)[i] || 0), 0);
export const pnFmt = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }) : "");

// ---------- kleines Markdown (pnMd): Überschriften, Listen (auch eingerückt), fett, kursiv
export type Seg = { t: string; b?: boolean; i?: boolean };
export type Li = { li: Seg[] };
export type Ul = { ul: (Li | Ul)[] };
export type Block = { h4: Seg[] } | { p: Seg[] } | Ul;

/** **fett** und *kursiv* (kursiv nur mit Leerraum davor und danach, wie die Live-App) */
export function pnInline(s: string): Seg[] {
  const out: Seg[] = [];
  s.split(/\*\*(.+?)\*\*/).forEach((part, k) => {
    if (k % 2) { out.push({ t: part, b: true }); return; }
    const re = /(^|\s)\*(.+?)\*(?=\s|$)/g; let last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(part))) { const start = m.index + m[1].length; out.push({ t: part.slice(last, start) }); out.push({ t: m[2], i: true }); last = re.lastIndex; }
    out.push({ t: part.slice(last) });
  });
  return out.filter((x) => x.t !== "" || x.b || x.i);
}
export function pnMd(s: string): Block[] {
  const out: Block[] = [], stack: Ul[] = []; // offene Listen, innerste zuletzt
  const close = (n: number) => { while (stack.length > n) stack.pop(); };
  str(s).replace(/\r/g, "").split("\n").forEach((l) => {
    const li = l.match(/^(\s*)[-*] (.*)$/);
    if (li) {
      const lv = Math.floor(li[1].length / 2) + 1;
      while (stack.length < lv) { const ul: Ul = { ul: [] }; if (stack.length) stack[stack.length - 1].ul.push(ul); else out.push(ul); stack.push(ul); }
      close(lv); stack[stack.length - 1].ul.push({ li: pnInline(li[2]) }); return;
    }
    close(0);
    const hd = l.match(/^#{1,4} (.*)$/); if (hd) { out.push({ h4: pnInline(hd[1]) }); return; }
    if (l.trim()) out.push({ p: pnInline(l) });
  });
  return out;
}
