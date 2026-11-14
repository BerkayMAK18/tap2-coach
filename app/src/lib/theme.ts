/** Darstellung wie in der Live-App: data-theme an <html> (light | dark), „wie System“ = ohne Attribut. Gespeichert unter tap2coach-theme. */
export type ThemeMode = "auto" | "light" | "dark";
export const KEY_THEME = "tap2coach-theme";
export const themeMode = (): ThemeMode => { const t = document.documentElement.getAttribute("data-theme"); return t === "light" || t === "dark" ? t : "auto"; };
export function setTheme(m: ThemeMode) {
  if (m === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", m);
  try { if (m === "auto") localStorage.removeItem(KEY_THEME); else localStorage.setItem(KEY_THEME, m); } catch { /* privat */ }
}
