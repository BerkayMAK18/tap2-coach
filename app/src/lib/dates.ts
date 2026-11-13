/** Datums-Helfer. Tage immer als lokales ISO-Datum "YYYY-MM-DD" (wie in der Live-App), Mittag als Anker gegen Zeitzonen-Sprünge. */
const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const today = () => iso(new Date());
export const addDays = (day: string, n: number) => { const d = new Date(day + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a: string, b: string) => Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const fmtDay = (s: string) => { const d = new Date(s + "T12:00:00"); return WD[d.getDay()] + ", " + pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "."; };
export function shuffle<T>(a: T[]): T[] { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
