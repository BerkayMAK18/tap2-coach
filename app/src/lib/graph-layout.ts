export type LayoutNode = { id: string; x: number; y: number };

/** Deterministic force-directed layout (repulsion + spring edges + gentle gravity). */
export function forceLayout(ids: string[], edges: { source: string; target: string }[], iterations = 300): Record<string, LayoutNode> {
  const n = ids.length;
  const nodes: LayoutNode[] = ids.map((id, i) => {
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    const r = 120 + (i % 7) * 25;
    return { id, x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const idx = new Map(ids.map((id, i) => [id, i]));
  const E = edges.map((e) => [idx.get(e.source), idx.get(e.target)]).filter((p): p is [number, number] => p[0] != null && p[1] != null);
  for (let it = 0; it < iterations; it++) {
    const t = 1 - it / iterations;
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = 1; dy = 0; d2 = 1; }
        const f = 9000 / d2;
        const d = Math.sqrt(d2);
        fx[i] += (dx / d) * f; fy[i] += (dy / d) * f;
        fx[j] -= (dx / d) * f; fy[j] -= (dy / d) * f;
      }
    for (const [a, b] of E) {
      const dx = nodes[b].x - nodes[a].x;
      const dy = nodes[b].y - nodes[a].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - 110) * 0.05;
      fx[a] += (dx / d) * f; fy[a] += (dy / d) * f;
      fx[b] -= (dx / d) * f; fy[b] -= (dy / d) * f;
    }
    for (let i = 0; i < n; i++) {
      fx[i] -= nodes[i].x * 0.01; fy[i] -= nodes[i].y * 0.01;
      const max = 30 * t + 1;
      nodes[i].x += Math.max(-max, Math.min(max, fx[i]));
      nodes[i].y += Math.max(-max, Math.min(max, fy[i]));
    }
  }
  return Object.fromEntries(nodes.map((nd) => [nd.id, nd]));
}

export type Cluster = { topic: string; x: number; y: number; w: number; h: number };

/** Readable layout: one column per topic, nodes ordered by dependency depth, labels beside nodes. */
export function clusterLayout(
  nodes: { id: string; topic: string }[],
  edges: { source: string; target: string }[],
  perRow = 3,
): { pos: Record<string, LayoutNode>; clusters: Cluster[] } {
  const depth = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let i = 0; i < nodes.length; i++)
    for (const e of edges) {
      const d = (depth.get(e.source) ?? 0) + 1;
      if (depth.has(e.target) && d > (depth.get(e.target) ?? 0) && d < nodes.length) depth.set(e.target, d);
    }
  const topics = Array.from(new Set(nodes.map((n) => n.topic)));
  const W = 300, ROW = 40, HEAD = 50, GAP = 40;
  const groups = topics.map((t) => nodes.filter((n) => n.topic === t).sort((a, b) => (depth.get(a.id)! - depth.get(b.id)!)));
  const pos: Record<string, LayoutNode> = {};
  const clusters: Cluster[] = [];
  let y = 0;
  for (let r = 0; r * perRow < groups.length; r++) {
    const row = groups.slice(r * perRow, r * perRow + perRow);
    const h = HEAD + Math.max(...row.map((g) => g.length)) * ROW + 10;
    row.forEach((g, c) => {
      const x = c * (W + GAP);
      clusters.push({ topic: topics[r * perRow + c], x, y, w: W, h });
      g.forEach((n, i) => (pos[n.id] = { id: n.id, x: x + 20, y: y + HEAD + i * ROW + ROW / 2 }));
    });
    y += h + GAP;
  }
  return { pos, clusters };
}
