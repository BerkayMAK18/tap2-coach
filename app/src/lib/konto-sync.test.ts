/**
 * Abgleich mit dem Konto („ein Konto, ein Stand“): Schein-Server mit denselben Regeln wie app_sync_push /
 * app_tutor_state_push (supabase/001, 004): Versionsprüfung, bei Konflikt kommt der aktuelle Stand zurück.
 */
import { describe, expect, it } from "vitest";
import { TAP2 } from "@/content/catalog";
import { stab } from "./gami/state";
import { kontoSync, type Doc, type Rpc } from "./konto-sync";
import { kbIds, makeKb, paketeOf } from "./tutor-kb";
import { EPOCH, addEvidence, addXpDay, emptyTutor, type Ev } from "./tutor-state";
import { syncTutor } from "./tutor-sync";

const kb = makeKb(TAP2), known = kbIds(kb), K = `${paketeOf(kb, "T03")[0]}.1`;
const ev = (id: string, at: number): Ev => ({ id, at: EPOCH + at, k: K, t: "T03", art: "beleg", w: 0.5 });

/** Schein-Server: eine Zeile pro Konto */
function server() {
  let row: { rev: number; data: unknown } | null = null; const log: string[] = [];
  const rpc: Rpc = async (fn, a) => {
    log.push(fn);
    if (fn.endsWith("_pull")) return row ? structuredClone(row) : null;
    const base = a.p_base as number, data = structuredClone(a.p_data);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("app: ungueltige daten");
    if (!row) { if (base !== 0) return { ok: false, rev: 0, gone: true }; row = { rev: 1, data }; return { ok: true, rev: 1 }; }
    if (row.rev !== base) return { ok: false, rev: row.rev, data: structuredClone(row.data) };
    row = { rev: row.rev + 1, data }; return { ok: true, rev: row.rev };
  };
  return { rpc, log, get row() { return row; } };
}

describe("kontoSync", () => {
  it("Tutor-Stand: zwei Geräte am selben Konto kommen zum selben Stand, ohne Schlüssel", async () => {
    const sv = server();
    let a = addEvidence(emptyTutor(), [ev("a1", 1)]); a = addXpDay(a, "2026-11-14", "geraetA", 40);
    let b = addEvidence(emptyTutor(), [ev("b1", 2)]); b = addXpDay(b, "2026-11-14", "geraetB", 30);
    const ra = await syncTutor(sv.rpc, a, known); expect(ra.pushed).toBe(true);
    const rb = await syncTutor(sv.rpc, b, known);
    expect(rb.changed).toBe(true); expect(rb.state.ev.map((e) => e.id)).toEqual(["a1", "b1"]);
    sv.log.length = 0;
    const ra2 = await syncTutor(sv.rpc, ra.state, known);
    expect(stab(ra2.state)).toBe(stab(rb.state)); expect(ra2.pushed).toBe(false); expect(sv.log).toEqual(["app_tutor_state_pull"]); // nichts Neues → nur lesen
    expect(ra2.state.xp["2026-11-14"]).toEqual({ geraetA: 40, geraetB: 30 });
  });
  it("Konflikt: anderes Gerät schreibt zwischen Lesen und Schreiben → einmischen, erneut schreiben, nichts geht verloren", async () => {
    const sv = server();
    await syncTutor(sv.rpc, addEvidence(emptyTutor(), [ev("a1", 1)]), known);
    let raced = false;
    const racing: Rpc = async (fn, a) => {
      if (fn.endsWith("_push") && !raced) { raced = true; await syncTutor(sv.rpc, addEvidence(emptyTutor(), [ev("x9", 9)]), known); }
      return sv.rpc(fn, a);
    };
    const r = await syncTutor(racing, addEvidence(emptyTutor(), [ev("b1", 2)]), known);
    expect(r.pushed).toBe(true); expect(r.state.ev.map((e) => e.id)).toEqual(["a1", "b1", "x9"]);
    expect((sv.row!.data as { ev: Ev[] }).ev.map((e) => e.id)).toEqual(["a1", "b1", "x9"]);
  });
  it("unbrauchbarer Inhalt in der Cloud wird überschrieben, lokal geht nichts verloren; Fremddaten werden geprüft", async () => {
    type T = { n: number[] };
    const doc: Doc<T> = { pull: "x_pull", push: "x_push", read: (d) => (d && Array.isArray((d as T).n) ? { n: (d as T).n.filter((x) => typeof x === "number") } : null), merge: (a, b) => ({ n: [...new Set([...a.n, ...b.n])].sort() }), same: (a, b) => stab(a) === stab(b), data: (t) => t };
    const sv = server();
    await sv.rpc("x_push", { p_base: 0, p_data: { kaputt: true } });
    const r = await kontoSync(sv.rpc, doc, { n: [1, 2] });
    expect(r.pushed).toBe(true); expect(sv.row!.data).toEqual({ n: [1, 2] });
    await sv.rpc("x_push", { p_base: 2, p_data: { n: [3, "<x>"] } });
    expect((await kontoSync(sv.rpc, doc, { n: [1] })).state).toEqual({ n: [1, 3] });
  });
});
