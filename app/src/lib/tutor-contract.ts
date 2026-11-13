import { z } from 'zod';
import type { Phase, PlanStep } from './learn-types';
import { questSchema } from './tutor-quest';

export const propositionSchema = z.object({
  statement: z.string().trim().min(1),
  topic: z.string().trim().min(1),
  premises: z.array(z.string()),
  evidence: z.string().trim().min(1),
});
export const planStepSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  depends_on: z.array(z.number().int().nonnegative()),
});
export const tutorTurnSchema = z.object({
  title: z.string(), reply: z.string().trim().min(1),
  next_phase: z.enum(['measure', 'plan', 'teach', 'practice', 'done']),
  plan_update: z.boolean(), plan: z.array(planStepSchema).max(8),
  current_step: z.number().int().nonnegative(), learner_model: z.string(),
  new_propositions: z.array(propositionSchema).max(12),
  diagram_prompt: z.string(), demo_html: z.string(),
  quest: questSchema.optional(),
});
export const assessmentSchema = z.object({
  score: z.number().finite().nonnegative(),
  summary: z.string().trim().min(1),
  strengths: z.array(z.string()), gaps: z.array(z.string()),
  steps: z.array(planStepSchema).min(1).max(8),
  next_question: z.string().trim().min(1),
  propositions: z.array(propositionSchema).max(12),
});
export type Assessment = z.infer<typeof assessmentSchema>;
export type TutorTurn = z.infer<typeof tutorTurnSchema>;
export type ProvenProposition = z.infer<typeof propositionSchema>;
export const phaseSchema = z.enum(['measure', 'plan', 'teach', 'practice', 'done']);

export function validPlan(plan: PlanStep[]): boolean {
  return plan.every((step, i) => step.depends_on.every(d => Number.isInteger(d) && d >= 0 && d < i));
}

/** Claims need a verbatim fragment of the learner's own answer, never tutor text. */
export function evidencedPropositions(items: ProvenProposition[], answer: string) {
  const accepted = items.map((p, i) => ({ p, i })).filter(({ p }) => p.evidence.trim().length > 0 && answer.includes(p.evidence.trim()));
  const indices = new Map(accepted.map(({ i }, next) => [i, next]));
  return accepted.map(({ p, i }) => ({ ...p, premises: p.premises.flatMap(ref => {
    const match = /^new:(\d+)$/.exec(ref);
    if (!match) return [ref];
    const original = Number(match[1]);
    const next = indices.get(original);
    return next !== undefined && original < i ? [`new:${next}`] : [];
  }) }));
}

/** Diagnosis cannot skip planning; completion requires demonstrated understanding. */
export function resolveTutorState(session: { phase: Phase; current_step: number; plan: PlanStep[]; kind: string }, out: TutorTurn, answer: string) {
  const evidence = evidencedPropositions(out.new_propositions, answer);
  const proposed = out.plan_update && out.plan.length && validPlan(out.plan) ? out.plan : session.plan;
  if (session.phase === 'measure') {
    return { phase: proposed.length && answer.trim() && out.next_phase !== 'measure' ? 'plan' as const : 'measure' as const, plan: proposed, current_step: 0 };
  }
  if (session.phase === 'plan') return { phase: answer.trim() && out.next_phase === 'teach' ? 'teach' as const : 'plan' as const, plan: proposed, current_step: 0 };
  if (session.phase === 'done') return { phase: 'done' as const, plan: proposed, current_step: session.current_step };
  const max = Math.max(0, proposed.length - 1);
  const current_step = evidence.length ? Math.min(max, session.current_step + 1, out.current_step) : session.current_step;
  const phase = out.next_phase === 'done' && evidence.length && session.current_step >= max ? 'done' : session.phase === 'practice' || (out.next_phase === 'practice' && session.kind === 'practice' && session.current_step >= max && evidence.length) ? 'practice' : 'teach';
  return { phase: phase as Phase, plan: proposed, current_step };
}

export function assessmentFeedback(a: Assessment, points: number) {
  const score = Math.min(points, a.score);
  return `**Punkte: ${score} / ${points}**\n\n${a.summary}\n\n### Das kannst du bereits\n${a.strengths.length ? a.strengths.map(s => `- ${s}`).join('\n') : 'Noch nicht nachgewiesen.'}\n\n### Das fehlt noch\n${a.gaps.length ? a.gaps.map(s => `- ${s}`).join('\n') : 'Keine fachlichen Lücken in dieser Antwort erkannt.'}\n\n### Dein nächster Lernweg\n${a.steps.map((s, i) => `${i + 1}. **${s.title}** — ${s.description}`).join('\n')}\n\n**Nächste Verständnisfrage:** ${a.next_question}\n\n*KI-Einschätzung, keine offizielle IHK-Bewertung.*`;
}