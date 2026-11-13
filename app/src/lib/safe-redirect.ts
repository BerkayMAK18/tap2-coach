/**
 * Prüft das `redirect`-Ziel nach der Anmeldung (Schutz vor Open Redirect).
 * Erlaubt nur relative App-Pfade wie "/dashboard?x=1". Abgelehnt: "//host", "/\host" (Browser lesen
 * das als "//host"), absolute URLs, Steuerzeichen und sehr lange Werte.
 */
export function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 300) return undefined;
  if (!/^\/[A-Za-z0-9\-._~/?=&%]*$/.test(value) || value.startsWith("//")) return undefined;
  return value;
}
