/**
 * Abgleich mit dem Konto („ein Konto, ein Stand“): holen → zusammenführen → bei Änderung zurückschreiben, mit
 * Versionsprüfung wie app_sync_push / app_tutor_state_push (supabase/001, 004). War ein anderes Gerät schneller, kommt
 * dessen Stand zurück; er wird eingemischt und erneut geschrieben. Kein Schlüssel – der Login reicht.
 * Rein bis auf die übergebenen Abhängigkeiten; getestet mit einem Schein-Server (konto-sync.test.ts).
 */
export type Rpc = (fn: string, args: Record<string, unknown>) => Promise<unknown>;
type Row = { ok?: boolean; rev?: number; data?: unknown; gone?: boolean } | null;
export type Doc<T> = {
  pull: string; push: string;
  /** Fremddaten aus der Cloud prüfen; null = unbrauchbar (wird dann überschrieben, lokal geht nichts verloren) */
  read: (data: unknown) => T | null;
  merge: (local: T, remote: T) => T;
  same: (a: T, b: T) => boolean;
  data: (t: T) => unknown;
};
export type KontoResult<T> = { state: T; rev: number; changed: boolean; pushed: boolean };

/** Einmal abgleichen. Die Version kommt immer frisch vom Server (pull) – so wird nie auf einen veralteten Stand geschrieben. */
export async function kontoSync<T>(rpc: Rpc, doc: Doc<T>, local: T): Promise<KontoResult<T>> {
  let row = (await rpc(doc.pull, {})) as Row, state = local;
  for (let tries = 0; tries < 4; tries++) {
    const remote = row?.data != null ? doc.read(row.data) : null, base = row ? +(row.rev ?? 0) || 0 : 0;
    if (remote) state = doc.merge(state, remote);
    if (remote && doc.same(remote, state)) return { state, rev: base, changed: !doc.same(state, local), pushed: false };
    const res = (await rpc(doc.push, { p_base: base, p_data: doc.data(state) })) as Row;
    if (res?.ok) return { state, rev: +(res.rev ?? 0), changed: !doc.same(state, local), pushed: true };
    row = res?.gone ? null : res; // anderes Gerät war schneller (oder Stand gelöscht): einmischen, erneut versuchen
  }
  throw new Error("Abgleich gerade nicht möglich, versuche es gleich noch einmal.");
}
