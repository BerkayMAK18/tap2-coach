import { describe, expect, it } from 'vitest';
import { evidencedPropositions, resolveTutorState, validPlan, assessmentSchema, assessmentFeedback, type TutorTurn } from './tutor-contract';
const plan = [{ title: 'Grundlage', description: 'Verstehen', depends_on: [] }, { title: 'Anwenden', description: 'Begründen', depends_on: [0] }];
const turn: TutorTurn = { title: 'SQL', reply: 'Frage', next_phase: 'done', plan_update: true, plan, current_step: 1, learner_model: 'offen', new_propositions: [], diagram_prompt: '', demo_html: '' };
const proof = { statement: 'JOIN verknüpft Tabellen.', topic: 'SQL', premises: [], evidence: 'JOIN verknüpft Tabellen' };
describe('Diagnose → Plan → schrittweises Lernen', () => {
  it('beginnt auch im Übungsmodus ohne Antwort mit Diagnose', () => {
    expect(resolveTutorState({ phase: 'measure', current_step: 0, plan: [], kind: 'practice' }, turn, '').phase).toBe('measure');
  });
  it('überspringt den Plan nach einer Diagnose nicht', () => {
    expect(resolveTutorState({ phase: 'measure', current_step: 0, plan: [], kind: 'teach' }, turn, 'Ich kenne JOIN').phase).toBe('plan');
  });
  it('beginnt nach der Planantwort mit Schritt 0', () => {
    expect(resolveTutorState({ phase: 'plan', current_step: 0, plan, kind: 'teach' }, { ...turn, next_phase: 'teach' }, 'Los')).toEqual({ phase: 'teach', current_step: 0, plan });
  });
  it('springt ohne belegtes Verständnis nicht weiter und erklärt nichts als abgeschlossen', () => {
    expect(resolveTutorState({ phase: 'teach', current_step: 0, plan, kind: 'teach' }, turn, 'weiß nicht')).toEqual({ phase: 'teach', current_step: 0, plan });
  });
  it('prüft zuerst den letzten Schritt statt vorzeitig abzuschließen', () => {
    expect(resolveTutorState({ phase: 'teach', current_step: 0, plan, kind: 'teach' }, { ...turn, new_propositions: [proof] }, proof.evidence)).toEqual({ phase: 'teach', current_step: 1, plan });
  });
  it('nimmt nur wörtlich belegte Antworten in den Graph auf', () => {
    expect(evidencedPropositions([proof], 'weiß nicht')).toEqual([]);
    expect(evidencedPropositions([proof], proof.evidence)).toEqual([proof]);
  });
  it('weist zyklische oder zukünftige Voraussetzungen zurück', () => {
    expect(validPlan(plan)).toBe(true);
    expect(validPlan([{ ...plan[0], depends_on: [0] }])).toBe(false);
  });
  it('behält die richtige Voraussetzung bei, wenn unbelegte Erkenntnisse entfernt werden', () => {
    const items = [{ ...proof, evidence: 'nicht gesagt' }, proof, { ...proof, premises: ['new:0', 'new:1'], statement: 'Folgerung' }];
    expect(evidencedPropositions(items, proof.evidence)[1].premises).toEqual(['new:0']);
  });
  it('begrenzt die Bewertung auf die verfügbaren Punkte', () => {
    const a = assessmentSchema.parse({ score: 12, summary: 'Gut', strengths: [], gaps: [], steps: plan, next_question: 'Warum?', propositions: [] });
    expect(assessmentFeedback(a, 5)).toContain('Punkte: 5 / 5');
  });
});