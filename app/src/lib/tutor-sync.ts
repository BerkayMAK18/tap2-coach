/**
 * Tutor-Stand auf allen Geräten: im Konto (app_tutor_state, supabase/004_app_tutor_state_konto.sql). Der Login reicht.
 * Fremddaten gehen durch normalizeTutor, zusammengeführt wird mit mergeTutor (kommutativ, nichts geht verloren).
 */
import { stab } from "./gami/state";
import { kontoSync, type Doc, type Rpc } from "./konto-sync";
import { mergeTutor, normalizeTutor, type Known, type TutorState } from "./tutor-state";

export const tutorDoc = (known: Known): Doc<TutorState> => ({
  pull: "app_tutor_state_pull", push: "app_tutor_state_push",
  read: (d) => normalizeTutor(d, known),
  merge: mergeTutor,
  same: (a, b) => stab(a) === stab(b),
  data: (s) => s,
});
export const syncTutor = (rpc: Rpc, local: TutorState, known: Known) => kontoSync(rpc, tutorDoc(known), local);
