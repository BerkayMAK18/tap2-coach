export type SavedSession = {
  id: string;
  goal: string;
  title: string;
  kind: string;
  phase: string;
  updated_at: string;
};

export const PHASE_LABEL: Record<string, string> = {
  measure: 'Stand prüfen', plan: 'Lernweg planen', teach: 'Verstehen', practice: 'Anwenden', done: 'Abgeschlossen',
};

function normalized(value: string) {
  return value.toLocaleLowerCase('de-DE').replace(/\s+/g, ' ').trim();
}

/** Reuse exact goals or a topic's existing path, including goals from older UI entry points. */
export function findSavedSession(sessions: SavedSession[], goal: string, kind: string, topic?: { id: string; name: string }) {
  const matches = sessions.filter(session => {
    if (session.kind !== kind) return false;
    if (normalized(session.goal) === normalized(goal)) return true;
    if (!topic) return false;
    const text = normalized(session.goal);
    return text.includes(normalized(topic.name)) || new RegExp(`\\b${topic.id}\\b`, 'i').test(session.goal);
  });
  return matches.sort((a, b) => {
    const completion = Number(a.phase === 'done') - Number(b.phase === 'done');
    return completion || b.updated_at.localeCompare(a.updated_at);
  })[0];
}

export function filterSessions<T extends SavedSession>(sessions: T[], query: string, status = 'all', messageMatches: string[] = []) {
  const q = normalized(query);
  return sessions.filter(session => {
    if (status === 'open' && session.phase === 'done') return false;
    if (status === 'done' && session.phase !== 'done') return false;
    return !q || normalized(`${session.title} ${session.goal}`).includes(q) || messageMatches.includes(session.id);
  });
}