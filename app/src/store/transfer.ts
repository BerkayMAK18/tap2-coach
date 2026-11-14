/**
 * Übertragen per Link/QR: erzeugter Link (UI.tx) und empfangener Stand (UI.imp) der Live-App.
 * Überdauert Seitenwechsel, nicht das Neuladen. Ein Link mit #import=… öffnet beim Start die Einstellungen (txReceive).
 */
import { create } from "zustand";
import qrcode from "qrcode-generator";
import { gm } from "./gami";
import { txApply, txDecode, txEncode, type TxIn } from "@/lib/transfer";
import { useProgress } from "./progress";

export type Tx = { busy?: boolean; err?: string; link?: string; qr?: { n: number; d: string; k: number } | null; partial?: boolean; at?: string } | null;
export type Imp = { inc?: TxIn; err?: string; done?: string } | null;

/** QR-Code als Pfad (qrSVG der Live-App): je dunklem Modul ein Quadrat, ganze Pixel pro Modul = sicher scannbar */
export function qrPath(text: string) {
  const q = qrcode(0, "L"); q.addData(text, "Byte"); q.make();
  const n = q.getModuleCount(); let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { n, d, k: Math.max(3, Math.ceil(240 / (n + 8))) };
}
const base = () => location.origin + "/";

export const useTransfer = create<{ tx: Tx; imp: Imp; build: () => Promise<void>; receive: (code: string) => Promise<void>; apply: (mode: "merge" | "replace") => void; cancel: () => void }>((set, get) => ({
  tx: null, imp: null,
  build: async () => {
    set({ tx: { busy: true } });
    try {
      const S = useProgress.getState().S, g = gm.pack();
      const full = base() + "#import=" + (await txEncode(S, true, g));
      let qrText = full, partial = false, qr: ReturnType<typeof qrPath> | null = null;
      if (full.length > 1100) { const core = base() + "#import=" + (await txEncode(S, false, g)); if (core.length < full.length) { qrText = core; partial = true; } } // QR möglichst klein = sicher scannbar
      try { qr = qrPath(qrText); } catch { qr = null; }
      set({ tx: { link: full, qr, partial, at: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) } });
    } catch { set({ tx: { err: "Der QR-Code konnte nicht erstellt werden. Nutze den Link oder die Sicherungsdatei." } }); }
  },
  receive: async (code) => {
    try { set({ imp: { inc: await txDecode(code) } }); }
    catch (e) { set({ imp: { err: e instanceof Error && e.message === "nozip" ? "Dieser Browser kann den Lernstand nicht entpacken. Bitte Browser aktualisieren oder die Sicherungsdatei nutzen." : "Der Link bzw. Code ist ungültig oder unvollständig." } }); }
  },
  apply: (mode) => {
    const inc = get().imp?.inc; if (!inc) return;
    const P = useProgress.getState();
    P.applySynced(txApply(P.S, inc, mode));
    if (mode === "replace") P.setSession(null);
    if (inc.g) gm.merge(inc.g); // Belohnungen werden immer zusammengeführt, nie ersetzt
    set({ imp: { done: mode === "merge" ? "Mit deinem Stand zusammengeführt." : "Dein Stand wurde ersetzt." }, tx: null });
  },
  cancel: () => set({ imp: null }),
}));
