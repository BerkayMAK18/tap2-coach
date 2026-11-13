export type PlanStep = { title: string; description: string; depends_on: number[] };
export type Attachment = { path: string; name: string; type: string };
export type Source = { url: string; title: string };
export type SessionKind = "teach" | "practice";
export type Phase = "measure" | "plan" | "teach" | "practice" | "done";
