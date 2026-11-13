import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Button, Input, Label, Tabs, TabsList, TabsTrigger } from '@/ui';
import { SessionList } from '@/components/learn/SessionList';
import { sessionsQuery } from '@/lib/queries';
import { filterSessions } from '@/lib/session-history';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/_authenticated/verlauf')({
  head: () => ({ meta: [
    { title: 'Gespräche und Lernstände — TAP2 Coach' },
    { name: 'description', content: 'Finde deine Tutor-Gespräche und setze gespeicherte Lernwege fort.' },
    { property: 'og:title', content: 'Gespräche und Lernstände — TAP2 Coach' },
    { property: 'og:description', content: 'Deine bisherigen Antworten, Lernstände und Tutor-Gespräche.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(sessionsQuery()),
  component: History,
});

function History() {
  const { data: sessions } = useSuspenseQuery(sessionsQuery());
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  useEffect(() => { const timer = setTimeout(() => setSearch(query.trim()), 300); return () => clearTimeout(timer); }, [query]);
  const messageSearch = useQuery({
    queryKey: ['conversation-search', search], enabled: search.length >= 2,
    queryFn: async () => {
      const literal = search.replace(/[\\%_]/g, '\\$&');
      const { data, error } = await supabase.from('session_messages').select('session_id').ilike('content', `%${literal}%`);
      if (error) throw error;
      return [...new Set(data.map(m => m.session_id))];
    },
  });
  const results = filterSessions(sessions, query, status, search === query.trim() ? messageSearch.data : []);
  return <div className="container mx-auto w-full space-y-6 px-6 py-8 md:px-10">
    <header className="space-y-2"><h1 className="font-head text-heading-300">Deine Gespräche</h1><p className="text-body-300 text-slate">{sessions.length} gespeicherte Lernwege</p></header>
    <div className="space-y-2"><Label htmlFor="history-search">Gespräche und Antworten suchen</Label><Input id="history-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Thema, Frage oder Begriff" /></div>
    <Tabs value={status} onValueChange={setStatus}><TabsList><TabsTrigger value="all">Alle</TabsTrigger><TabsTrigger value="open">Offen</TabsTrigger><TabsTrigger value="done">Abgeschlossen</TabsTrigger></TabsList></Tabs>
    {messageSearch.isFetching && <p className="text-body-200" role="status">Antworten durchsuchen…</p>}
    {messageSearch.isError && <p className="text-body-200">Antworten konnten nicht durchsucht werden. Titel und Lernziele bleiben durchsuchbar.</p>}
    {results.length ? <SessionList sessions={results} /> : <div className="space-y-3"><p className="text-body-300">{sessions.length ? 'Keine passenden Gespräche.' : 'Noch keine gespeicherten Gespräche.'}</p>{query && <Button variant="ghost" onClick={() => setQuery('')}>Suche zurücksetzen</Button>}</div>}
  </div>;
}