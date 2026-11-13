import { describe, expect, it } from 'vitest';
import { findSavedSession, filterSessions, type SavedSession } from './session-history';

const session = (id: string, goal: string, phase = 'teach', date = '2026-11-13', kind = 'teach'): SavedSession => ({ id, goal, title: goal, phase, updated_at: date, kind });
describe('Saved tutor paths', () => {
  it('reopens the same conversation when the goal is started again', () => {
    expect(findSavedSession([session('old', ' SQL verstehen ')], 'sql verstehen', 'teach')?.id).toBe('old');
  });
  it('reuses legacy topic goals even after progress text changes', () => {
    const old = session('sql', 'FIAE Lernstand diagnostizieren: SQL. Noch kein belegter Lernstand.');
    expect(findSavedSession([old], 'SQL jetzt lernen', 'teach', { id: 'T02', name: 'SQL' })?.id).toBe('sql');
  });
  it('continues the latest open path before a completed one', () => {
    const rows = [session('complete', 'SQL', 'done', '2026-11-14'), session('first', 'SQL', 'plan', '2026-11-11'), session('latest', 'SQL', 'teach', '2026-11-13')];
    expect(findSavedSession(rows, 'SQL lernen', 'teach', { id: 'T02', name: 'SQL' })?.id).toBe('latest');
  });
  it('does not mix topics or teaching and practice', () => {
    expect(findSavedSession([session('python', 'Python'), session('sql-practice', 'SQL', 'practice', '2026-11-13', 'practice')], 'SQL', 'teach', { id: 'T02', name: 'SQL' })).toBeUndefined();
  });
  it('finds previous conversations by title, goal, or matching message', () => {
    const rows = [session('sql', 'SQL filtern'), session('python', 'Python Schleifen')];
    expect(filterSessions(rows, 'schleifen').map(s => s.id)).toEqual(['python']);
    expect(filterSessions(rows, 'WHERE', 'all', ['sql']).map(s => s.id)).toEqual(['sql']);
  });
  it('keeps completed conversations available in history', () => {
    expect(filterSessions([session('done', 'SQL', 'done'), session('open', 'Python')], '', 'done').map(s => s.id)).toEqual(['done']);
  });
});