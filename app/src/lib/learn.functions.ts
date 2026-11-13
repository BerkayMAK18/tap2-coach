import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Attachment, SessionKind } from "./learn-types";

export const createSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { goal: string; kind: SessionKind; topicId?: string; newConversation?: boolean }) => {
    const goal = input.goal.trim().slice(0, 1000);
    if (!goal) throw new Error("Tell us what you want to understand.");
    return { goal, kind: input.kind === "practice" ? "practice" : "teach", topicId: input.topicId, newConversation: input.newConversation === true } as const;
  })
  .handler(async ({ data, context }) => {
    if (!data.newConversation) {
      const { findSavedSession } = await import('./session-history');
      const { data: saved, error: savedError } = await context.supabase.from('learning_sessions').select('*').eq('user_id', context.userId).eq('kind', data.kind).order('updated_at', { ascending: false });
      if (savedError) throw savedError;
      const { default: content } = await import('@/content/tap2.json');
      const topic = data.topicId ? content.topics.find(t => t.id === data.topicId) : undefined;
      const existing = findSavedSession(saved ?? [], data.goal, data.kind, topic);
      if (existing) return { id: existing.id };
    }
    const { runAgent } = await import("./agent.server");
    const { data: s, error } = await context.supabase
      .from("learning_sessions")
      .insert({ user_id: context.userId, goal: data.goal, kind: data.kind, phase: "measure" })
      .select("*")
      .single();
    if (error || !s) throw new Error(error?.message ?? "Could not create session");
    await runAgent(context.supabase, context.userId, s, true);
    return { id: s.id };
  });

export const sendTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { sessionId: string; content: string; thinking?: string; confidence?: number | null; attachments?: Attachment[] }) => {
      const atts = (input.attachments ?? []).slice(0, 6);
      return {
        sessionId: input.sessionId,
        content: input.content.slice(0, 8000),
        thinking: input.thinking?.slice(0, 8000) || null,
        confidence: typeof input.confidence === "number" ? Math.max(1, Math.min(5, Math.round(input.confidence))) : null,
        attachments: atts,
      };
    },
  )
  .handler(async ({ data, context }) => {
    const { runAgent } = await import("./agent.server");
    const { data: s, error } = await context.supabase.from("learning_sessions").select("*").eq("id", data.sessionId).single();
    if (error || !s) throw new Error("Session not found");
    for (const a of data.attachments) {
      if (!a.path.startsWith(`${context.userId}/`)) throw new Error("Invalid attachment");
    }
    const { error: insErr } = await context.supabase.from("session_messages").insert({
      session_id: s.id,
      user_id: context.userId,
      role: "user",
      content: data.content,
      thinking: data.thinking,
      confidence: data.confidence,
      attachments: data.attachments,
    });
    if (insErr) throw new Error(insErr.message);
    return await runAgent(context.supabase, context.userId, s);
  });

export const importNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => {
    const text = input.text.trim();
    if (text.length < 20) throw new Error("Paste a bit more text so we have something to work with.");
    return { text };
  })
  .handler(async ({ data, context }) => {
    const { extractNotes } = await import("./agent.server");
    const count = await extractNotes(context.supabase, context.userId, data.text);
    return { count };
  });

export const resumeTutor = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sessionId: string }) => ({ sessionId: input.sessionId }))
  .handler(async ({ data, context }) => {
    const { data: session, error } = await context.supabase.from('learning_sessions').select('*').eq('id', data.sessionId).single();
    if (error || !session) throw new Error('Sitzung nicht gefunden.');
    const { data: latest, error: latestError } = await context.supabase.from('session_messages').select('role').eq('session_id', session.id).order('created_at', { ascending: false }).limit(1);
    if (latestError) throw latestError;
    if (latest?.[0]?.role === 'assistant') return { ok: true, graphCount: 0 };
    const { runAgent } = await import('./agent.server');
    return await runAgent(context.supabase, context.userId, session, !latest?.length);
  });

export const gradeAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { question: string; solution: string; answer: string; points: number; itemId?: string; practiceKey?: string }) => ({
    question: i.question.slice(0, 8000),
    solution: i.solution.slice(0, 8000),
    answer: i.answer.slice(0, 8000),
    points: Math.max(1, Math.min(100, Math.round(i.points || 10))),
    itemId: i.itemId, practiceKey: i.practiceKey,
  }))
  .handler(async ({ data, context }) => {
    if (!data.answer.trim()) throw new Error("Schreib zuerst eine Antwort.");
    let task = { ...data, topic: undefined as string | undefined };
    if (data.itemId) {
      const { default: content } = await import('@/content/tap2.json');
      const item = content.items.find(i => i.id === data.itemId);
      if (!item || item.type === 'mc') throw new Error('Diese Aufgabe ist nicht bewertbar.');
      task = { ...task, question: item.q, solution: item.a ?? '', points: 'points' in item && typeof item.points === 'number' ? item.points : 5, topic: item.topic };
    } else if (data.practiceKey) {
      const { PRACTICE, SQL_SEED } = await import('./practice');
      const [language, index] = data.practiceKey.split(':');
      if (language !== 'python' && language !== 'sql') throw new Error('Übung nicht gefunden.');
      const exercise = PRACTICE[language][Number(index)];
      if (!exercise) throw new Error('Übung nicht gefunden.');
      task = { ...task, question: exercise.task + (language === 'sql' ? `\nÜbungsdatenbank:\n${SQL_SEED}` : ''), solution: exercise.solution, points: 5, topic: language === 'sql' ? 'T02' : 'T01' };
    }
    const { assessAnswer } = await import('./agent.server');
    return await assessAnswer(context.supabase, context.userId, task);
  });
