/**
 * Tutor-Stand auf allen Geräten: Abgleich über einen Schein-Server mit denselben Regeln wie
 * supabase/003_app_tutor_state.sql (Versionsprüfung, Schlüssel-Prüfsumme kid, force). Echte Verschlüsselung (crypto.ts).
 */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { newSyncKey } from "./crypto";
import { stab } from "./gami/state";
import { kbIds, makeKb, paketeOf } from "./tutor-kb";
import { EPOCH, addEvidence, addXpDay, emptyTutor, type Ev } from "./tutor-state";
import { syncTutor, tutorKid, type Rpc } from "./tutor-sync";

const kb = makeKb(TAP2), known = kbIds(kb), K = `${paketeOf(kb, "T03")[0]}.1`;
const ev = (id: string, at: number, n?: string): Ev => ({ id, at: EPOCH + at, k: K, t: "T03", art: n ? "fehlvorstellung" : "beleg", w: n ? -0.5 : 0.5, ...(n ? { f: "fv1", n } : {}) });

/** Schein-Server: eine Zeile pro Konto, Regeln wie app_tutor_state_push */
function server() {
  let row: { rev: number; kid: string; blob: string } | null = null; const log: string[] = [];
  const rpc: Rpc = async (fn, a) => {
    log.push(fn);
    if (fn === "app_tutor_state_pull") return row ? { ...row } : null;
    if (fn !== "app_tutor_state_push") throw new Error("unbekannt");
    const base = a.p_base as number, kid = a.p_kid as string, blob = a.p_blob as string, force = !!a.p_force;
    if (!/^[0-9a-f]{16}$/.test(kid) || !/^1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(blob)) throw new Error("app: ungueltige daten");
    if (!row) { if (base !== 0) return { ok: false, rev: 0, gone: true }; row = { rev: 1, kid, blob }; return { ok: true, rev: 1 }; }
    if (row.kid !== kid && !force) return { ok: false, rev: row.rev, kid: row.kid };
    if (row.rev !== base && row.kid === kid) return { ok: false, rev: row.rev, kid: row.kid, blob: row.blob };
    row = { rev: row.rev + 1, kid, blob }; return { ok: true, rev: row.rev };
  };
  return { rpc, log, get row() { return row; }, set(r: typeof row) { row = r; } };
}

describe("syncTutor", () => {
  it("zwei Geräte mit demselben Schlüssel kommen zum selben Stand; der Server sieht nur verschlüsselten Text", async () => {
    const key = newSyncKey(), sv = server();
    let a = addEvidence(emptyTutor(), [ev("a1", 1, "2NF heißt atomar")]); a = addXpDay(a, "2026-11-14", "geraetA", 40);
    let b = addEvidence(emptyTutor(), [ev("b1", 2)]); b = addXpDay(b, "2026-11-14", "geraetB", 30);
    const ra = await syncTutor(sv.rpc, key, a, 0, known); expect(ra.pushed).toBe(true);
    expect(sv.row!.blob).not.toContain("atomar"); expect(sv.row!.kid).toBe(await tutorKid(key)); expect(sv.row!.kid).not.toContain(key);
    const rb = await syncTutor(sv.rpc, key, b, 0, known);
    expect(rb.changed).toBe(true); expect(rb.state.ev.map((e) => e.id)).toEqual(["a1", "b1"]);
    const ra2 = await syncTutor(sv.rpc, key, ra.state, ra.rev, known);
    expect(stab(ra2.state)).toBe(stab(rb.state)); expect(ra2.pushed).toBe(false); // nichts Neues → kein Schreiben
    expect(ra2.state.xp["2026-11-14"]).toEqual({ geraetA: 40, geraetB: 30 });
  });
  it("veraltete Version: Server liefert den neueren Stand, es wird zusammengeführt und erneut geschrieben", async () => {
    const key = newSyncKey(), sv = server();
    const a = await syncTutor(sv.rpc, key, addEvidence(emptyTutor(), [ev("a1", 1)]), 0, known);
    await syncTutor(sv.rpc, key, addEvidence(emptyTutor(), [ev("b1", 2)]), 0, known); // anderes Gerät war schneller
    const local = addEvidence(a.state, [ev("a2", 3)]);
    sv.log.length = 0;
    const r = await syncTutor(sv.rpc, key, local, a.rev, known);
    expect(r.pushed).toBe(true); expect(r.state.ev.map((e) => e.id)).toEqual(["a1", "b1", "a2"]);
  });
  it("anderer Schlüssel in der Cloud: nichts überschreiben; nur mit force ersetzen", async () => {
    const sv = server(), k1 = newSyncKey(), k2 = newSyncKey();
    await syncTutor(sv.rpc, k1, addEvidence(emptyTutor(), [ev("x", 1)]), 0, known);
    const before = sv.row!.blob;
    const r = await syncTutor(sv.rpc, k2, addEvidence(emptyTutor(), [ev("y", 2)]), 0, known);
    expect(r.mismatch).toBe(true); expect(sv.row!.blob).toBe(before);
    const f = await syncTutor(sv.rpc, k2, addEvidence(emptyTutor(), [ev("y", 2)]), 0, known, true);
    expect(f.pushed).toBe(true); expect(sv.row!.kid).toBe(await tutorKid(k2));
  });
  it("fremde oder kaputte Inhalte in der Cloud werden geprüft (unbekannte IDs fallen weg)", async () => {
    const key = newSyncKey(), sv = server();
    const { seal, aesKey } = await import("./crypto");
    sv.set({ rev: 3, kid: await tutorKid(key), blob: await seal({ v: 1, kind: "tutor", st: { ev: [ev("ok", 1), { ...ev("bad", 2), k: "P999.1" }] } }, await aesKey(key)) });
    const r = await syncTutor(sv.rpc, key, emptyTutor(), 0, known);
    expect(r.state.ev.map((e) => e.id)).toEqual(["ok"]);
  });
});
