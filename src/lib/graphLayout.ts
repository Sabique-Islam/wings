// Force-directed layout for the page graph.
//
// Pure and dependency-free: the graph is built from the local link index and the
// page hierarchy, never from a server query, and the simulation runs for a fixed
// number of ticks so it settles and then stops burning CPU.

export type GraphEdgeKind = "link" | "child";

export interface GraphEdge {
  from: string;
  to: string;
  kind: GraphEdgeKind;
}

export interface GraphNode {
  id: string;
  label: string;
  degree: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphSource {
  id: string;
  label: string;
  parentId: string | null;
}

const REPULSION = 5200;
const SPRING = 0.015;
const SPRING_LENGTH = 90;
const CENTER_PULL = 0.008;
const DAMPING = 0.85;
const MAX_SPEED = 12;

/**
 * Pick the most connected pages and lay them out on a circle. Starting from a
 * deterministic ring means reopening the graph shows the same picture.
 */
export function buildGraph(
  pages: GraphSource[],
  links: Array<{ from: string; to: string }>,
  maxNodes = 150,
): Graph {
  const known = new Set(pages.map((p) => p.id));
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  const addEdge = (from: string, to: string, kind: GraphEdgeKind) => {
    if (from === to || !known.has(from) || !known.has(to)) return;
    const key = `${from}\u0000${to}\u0000${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ from, to, kind });
  };

  for (const link of links) addEdge(link.from, link.to, "link");
  for (const page of pages) {
    if (page.parentId) addEdge(page.parentId, page.id, "child");
  }

  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  const ranked = [...pages].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
  );
  const kept = ranked.slice(0, maxNodes);
  const keptIds = new Set(kept.map((p) => p.id));

  const radius = 40 + kept.length * 2.2;
  const nodes: GraphNode[] = kept.map((page, index) => {
    const angle = (index / Math.max(1, kept.length)) * Math.PI * 2;
    return {
      id: page.id,
      label: page.label,
      degree: degree.get(page.id) ?? 0,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });

  return {
    nodes,
    edges: edges.filter((e) => keptIds.has(e.from) && keptIds.has(e.to)),
  };
}

/** Advance the simulation one tick, mutating node positions in place. */
export function stepLayout(graph: Graph): void {
  const { nodes, edges } = graph;
  const byId = new Map(nodes.map((n) => [n.id, n]));

  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]!;
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]!;
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 0.01) {
        // Perfectly coincident nodes have no direction to separate along.
        dx = (i % 2 === 0 ? 1 : -1) * 0.5;
        dy = 0.5;
        distanceSquared = dx * dx + dy * dy;
      }
      const force = REPULSION / distanceSquared;
      const distance = Math.sqrt(distanceSquared);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  for (const edge of edges) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const force = (distance - SPRING_LENGTH) * SPRING;
    const fx = (dx / distance) * force;
    const fy = (dy / distance) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  for (const node of nodes) {
    node.vx = (node.vx - node.x * CENTER_PULL) * DAMPING;
    node.vy = (node.vy - node.y * CENTER_PULL) * DAMPING;
    const speed = Math.hypot(node.vx, node.vy);
    if (speed > MAX_SPEED) {
      node.vx = (node.vx / speed) * MAX_SPEED;
      node.vy = (node.vy / speed) * MAX_SPEED;
    }
    node.x += node.vx;
    node.y += node.vy;
  }
}

export interface GraphBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function graphBounds(nodes: GraphNode[]): GraphBounds {
  if (nodes.length === 0) return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }
  return { minX, minY, maxX, maxY };
}

export function nodeRadius(node: GraphNode): number {
  return 4 + Math.min(9, node.degree * 1.4);
}
