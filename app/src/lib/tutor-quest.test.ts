import { describe, expect, it } from 'vitest';
import { currentQuest, readQuest, withQuest, pedagogicalReply, learnerReply } from './tutor-quest';

describe('saved tutor tasks', () => {
  const quest = { task: 'Bestimme den Schlüssel.', material: '| Bestellung | Artikel |\n| --- | --- |\n| 101 | A |' };
  it('retains the exact task and source table after saving and reading', () => {
    expect(readQuest(withQuest('Betrachte die Tabelle.', quest))).toEqual({ reply: 'Betrachte die Tabelle.', quest });
  });
  it('keeps the latest task while the learner is answering', () => {
    expect(currentQuest([
      { id: 'old', role: 'assistant', content: withQuest('Alt', { task: 'Alt', material: '' }) },
      { id: 'new', role: 'assistant', content: withQuest('Neu', quest) },
      { id: 'answer', role: 'user', content: 'Bestellung und Artikel' },
    ])).toEqual({ ...quest, messageId: 'new', legacy: false });
  });
  it('keeps legacy prompts and original assessment tasks without the learner answer', () => {
    expect(currentQuest([
      { id: 'input', role: 'user', content: 'Aufgabe:\nZerlege in 3NF.\n\nMeine Antwort:\nGeheim' },
      { id: 'feedback', role: 'assistant', content: 'Welche Abhängigkeit siehst du?' },
    ])).toEqual({ task: 'Welche Abhängigkeit siehst du?', material: 'Zerlege in 3NF.', messageId: 'feedback', legacy: true });
  });
  it('does not hide malformed saved content', () => {
    const content = '```tutor-quest\nnot json\n```';
    expect(readQuest(content).reply).toBe(content);
  });
  it('separates a saved assignment from its teaching without changing source data', () => {
    const explanation = 'Ein Schlüssel identifiziert einen Datensatz eindeutig.';
    const stored = withQuest(`${explanation}\n\n${quest.material}\n\n${quest.task}`, quest);
    expect(pedagogicalReply(stored)).toBe(explanation);
    expect(readQuest(stored).quest).toEqual(quest);
  });
  it('keeps legacy theory while moving explicit assignments and source tables out', () => {
    expect(pedagogicalReply(`1NF bedeutet atomare Werte.\n\n${quest.material}\n\nSchreibe die zweite Zeile.`)).toBe('1NF bedeutet atomare Werte.');
  });
  it('keeps the assessment learner answer but not the repeated assignment', () => {
    expect(learnerReply('Aufgabe:\nBestimme den Schlüssel.\n\nMeine Antwort:\nBestellung und Artikel')).toBe('Bestellung und Artikel');
    expect(learnerReply('Meine Rückfrage')).toBe('Meine Rückfrage');
  });
});