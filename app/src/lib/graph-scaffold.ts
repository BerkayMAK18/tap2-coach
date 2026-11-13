import content from '@/content/tap2.json';
import { PARTS, groupOf } from './curriculum';
import type { Database } from '@/integrations/supabase/types';
type Node = Database['public']['Tables']['propositions']['Row'];
type Edge = Database['public']['Tables']['proposition_links']['Row'];
export function scaffoldGraph(props: Node[], links: Edge[]) {
  const make = (id: string, statement: string, topic: string): Node => ({ id, statement, topic, source_kind: 'category', source_session_id: null, user_id: '', created_at: '' });
  const nodes = PARTS.map(part => make(`category:${part}`, part, part));
  const edges: Edge[] = [];
  const link = (source: string, target: string) => edges.push({ id: `structure:${source}:${target}`, premise_id: source, conclusion_id: target, user_id: '', created_at: '' });
  for (const t of content.topics) {
    nodes.push(make(`topic:${t.id}`, t.name, t.id));
    link(`category:${groupOf(t.part)}`, `topic:${t.id}`);
  }
  for (const p of props) if (content.topics.some(t => t.id === p.topic)) link(`topic:${p.topic}`, p.id);
  return { props: [...nodes, ...props], links: [...edges, ...links] };
}
