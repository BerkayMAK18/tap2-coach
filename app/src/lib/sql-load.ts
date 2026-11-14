/**
 * sql.js erst bei Bedarf laden (eigener Chunk + WebAssembly-Datei, vom Service Worker offline vorgehalten).
 * Wie loadSQL() in der Live-App: ein Versuch pro Seite, nach einem Fehler beim nächsten Klick erneut.
 */
import type { SqlStatic } from "./sql";

let loading: Promise<SqlStatic> | null = null;
export function loadSQL(): Promise<SqlStatic> {
  if (!loading) loading = (async () => {
    const [{ default: init }, { default: wasmUrl }] = await Promise.all([import("sql.js"), import("sql.js/dist/sql-wasm-browser.wasm?url")]);
    return (await init({ locateFile: () => wasmUrl })) as unknown as SqlStatic;
  })().catch((e) => { loading = null; throw e; });
  return loading;
}
