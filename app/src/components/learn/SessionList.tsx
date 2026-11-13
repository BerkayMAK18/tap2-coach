import { Link } from '@tanstack/react-router';
import { Badge, Button } from '@/ui';
import { PHASE_LABEL, type SavedSession } from '@/lib/session-history';

export function SessionList({ sessions }: { sessions: SavedSession[] }) {
  return <ul className="divide-y divide-border">
    {sessions.map(session => <li key={session.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Link to="/session/$sessionId" params={{ sessionId: session.id }} className="block break-words font-text text-body-400 font-medium underline focus-visible:ring-2 focus-visible:ring-ring">{session.title || 'Lerngespräch'}</Link>
        <div className="flex flex-wrap items-center gap-2"><Badge variant={session.phase === 'done' ? 'success' : 'white'}>{PHASE_LABEL[session.phase] ?? session.phase}</Badge><time className="text-body-200 text-slate" dateTime={session.updated_at}>{new Date(session.updated_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</time></div>
      </div>
      <Button asChild><Link to="/session/$sessionId" params={{ sessionId: session.id }}>{session.phase === 'done' ? 'Öffnen' : 'Fortsetzen'}</Link></Button>
    </li>)}
  </ul>;
}