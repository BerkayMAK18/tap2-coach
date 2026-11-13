import { describe, it, expect } from 'vitest';
import { scaffoldGraph } from './graph-scaffold';
describe('exam graph scaffold', () => {
  it('shows the four exam categories and 19 topics without claiming understanding', () => {
    const graph = scaffoldGraph([], []);
    expect(graph.props.filter(n => n.id.startsWith('category:')).map(n => n.statement)).toEqual(['Teil 1', 'Teil 2', 'Beides', 'SoWi']);
    expect(graph.props.filter(n => n.id.startsWith('topic:'))).toHaveLength(19);
    expect(graph.props.every(n => n.source_kind === 'category')).toBe(true);
  });
});
