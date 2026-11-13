/**
 * Sicherheits-Header für jede Antwort des Servers (Seiten und Server-Funktionen).
 * Registriert als `requestMiddleware` in src/start.ts.
 *
 * Bewusst noch ohne vollständige Content-Security-Policy für Skripte: TanStack Start rendert Inline-Skripte
 * für die Hydration, eine strikte CSP bräuchte Nonces. Die Direktiven unten brechen nichts und schließen
 * Clickjacking, fremde <base>-Tags, Plugins und Formular-Umleitungen aus.
 */
import { createMiddleware } from "@tanstack/react-start";

export const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Permissions-Policy": "camera=(), geolocation=(), payment=(), usb=(), microphone=(self)",
  "Cross-Origin-Opener-Policy": "same-origin",
};

export const securityHeaders = createMiddleware().server(async ({ next }) => {
  const result = await next();
  // Antwort-Header können unveränderlich sein → bei Bedarf kopieren.
  let response = result.response;
  try {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);
  } catch {
    response = new Response(response.body, response);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) response.headers.set(k, v);
  }
  return { ...result, response };
});
