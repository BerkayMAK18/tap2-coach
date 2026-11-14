/** Bestätigungsdialog: Aufruf ask(...) – Darstellung in confirm.tsx (ConfirmHost im Layout). */
import { create } from "zustand";

export type Ask = { title: string; text?: string; ok?: string; cancel?: string; danger?: boolean; icon?: string };
type Pending = Ask & { resolve: (v: boolean) => void };
export const useConfirm = create<{ q: Pending | null }>(() => ({ q: null }));

/** Dialog zeigen; true = bestätigt. Ein neuer Dialog bricht einen offenen ab. */
export function ask(o: Ask): Promise<boolean> {
  return new Promise((resolve) => { useConfirm.getState().q?.resolve(false); useConfirm.setState({ q: { ...o, resolve } }); });
}
export const done = (v: boolean) => { const q = useConfirm.getState().q; useConfirm.setState({ q: null }); q?.resolve(v); };

