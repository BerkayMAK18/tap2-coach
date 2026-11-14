/** Minimal-Typen für sql.js (nur der Einstieg; die genutzten Methoden stehen in sql.ts). */
declare module "sql.js" {
  const initSqlJs: (cfg?: { locateFile?: (file: string) => string }) => Promise<unknown>;
  export default initSqlJs;
}
