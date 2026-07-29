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

export interface GraphFilters {
  hideUnlinked: boolean;
  orphansOnly: boolean;
  tag: string | null;
}

/** BFS over undirected link edges up to `depth` hops from `centerId`. */
export function neighborhoodIds(
  centerId: string,
  edges: Array<{ from: string; to: string }>,
  depth: number,
): Set<string> {
  const adj = new Map<string, Set<string>>();
  for (const { from, to } of edges) {
    if (!adj.has(from)) adj.set(from, new Set());
    if (!adj.has(to)) adj.set(to, new Set());
    adj.get(from)!.add(to);
    adj.get(to)!.add(from);
  }

  const result = new Set<string>([centerId]);
  let frontier = new Set<string>([centerId]);
  for (let hop = 0; hop < depth; hop++) {
    const next = new Set<string>();
    for (const id of frontier) {
      for (const neighbor of adj.get(id) ?? []) {
        if (!result.has(neighbor)) {
          result.add(neighbor);
          next.add(neighbor);
        }
      }
    }
    frontier = next;
    if (frontier.size === 0) break;
  }
  return result;
}

/** Subgraph around the active page, always including the center node. */
export function buildLocalGraph(
  pages: GraphSource[],
  links: Array<{ from: string; to: string }>,
  centerId: string,
  depth: number,
  maxNodes = 150,
): Graph {
  const ids = neighborhoodIds(centerId, links, depth);
  const subset = pages.filter((p) => ids.has(p.id));
  if (!subset.some((p) => p.id === centerId)) {
    const center = pages.find((p) => p.id === centerId);
    if (center) subset.push(center);
  }
  const filteredLinks = links.filter((l) => ids.has(l.from) && ids.has(l.to));
  return buildGraph(subset, filteredLinks, maxNodes);
}

/** No incoming link edges and not nested under another page. */
export function isOrphan(
  pageId: string,
  linkEdges: Array<{ from: string; to: string }>,
  pages: GraphSource[],
): boolean {
  const page = pages.find((p) => p.id === pageId);
  if (page?.parentId) return false;
  return !linkEdges.some((e) => e.to === pageId);
}

export function applyGraphFilters(
  graph: Graph,
  pages: GraphSource[],
  filters: GraphFilters,
  tagsByEntryId: Map<string, string[]>,
  linkEdges: Array<{ from: string; to: string }>,
): Graph {
  let keep = new Set(graph.nodes.map((n) => n.id));

  if (filters.orphansOnly) {
    keep = new Set([...keep].filter((id) => isOrphan(id, linkEdges, pages)));
  }

  if (filters.hideUnlinked) {
    keep = new Set(
      [...keep].filter((id) => {
        const node = graph.nodes.find((n) => n.id === id);
        return node != null && node.degree > 0;
      }),
    );
  }

  if (filters.tag) {
    const wanted = filters.tag.toLowerCase();
    keep = new Set(
      [...keep].filter((id) =>
        (tagsByEntryId.get(id) ?? []).some((t) => t.toLowerCase() === wanted),
      ),
    );
  }

  const nodes = graph.nodes.filter((n) => keep.has(n.id));
  const keptIds = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: graph.edges.filter((e) => keptIds.has(e.from) && keptIds.has(e.to)),
  };
}

/** Seed coordinates from a persisted map; returns how many nodes were restored. */
export function applySavedPositions(
  nodes: GraphNode[],
  saved: Record<string, { x: number; y: number }>,
): number {
  let restored = 0;
  for (const node of nodes) {
    const pos = saved[node.id];
    if (!pos) continue;
    node.x = pos.x;
    node.y = pos.y;
    node.vx = 0;
    node.vy = 0;
    restored += 1;
  }
  return restored;
}

export function positionsToRecord(
  nodes: GraphNode[],
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    out[node.id] = { x: node.x, y: node.y };
  }
  return out;
}
