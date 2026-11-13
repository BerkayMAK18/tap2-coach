export type PlanStep = { title: string; description: string; depends_on: number[] };
export type Attachment = { path: string; name: string; type: string };
export type Source = { url: string; title: string };
export type SessionKind = "teach" | "practice";
export type Phase = "measure" | "plan" | "teach" | "practice" | "done";

import { z } from "zod";
/**
 * Pfad im privaten Bucket `attachments`: <user_id>/…/<datei>, max. 3 Ebenen darunter,
 * nur sichere Zeichen, keine "."/".."-Segmente. Ob <user_id> zum Aufrufer gehört, prüft der Server-Handler.
 */
export const storagePathSchema = z
  .string()
  .max(300)
  .regex(/^[0-9a-f-]{36}(\/[A-Za-z0-9_.-]{1,200}){1,3}$/)
  .refine((p) => p.split("/").every((seg) => seg !== "." && seg !== ".."), "Ungültiger Dateipfad");
