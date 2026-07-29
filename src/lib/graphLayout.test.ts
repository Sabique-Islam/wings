import { describe, it, expect } from "vitest";
import {
  applyGraphFilters,
  applySavedPositions,
  buildGraph,
  buildLocalGraph,
  graphBounds,
  isOrphan,
  neighborhoodIds,
  nodeRadius,
  stepLayout,
  type GraphSource,
} from "./graphLayout";

function page(id: string, parentId: string | null = null): GraphSource {
  return { id, label: id.toUpperCase(), parentId };
}

describe("buildGraph", () => {
  it("combines link edges with the page hierarchy", () => {
    const graph = buildGraph([page("a"), page("b"), page("c", "a")], [{ from: "a", to: "b" }]);

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { from: "a", to: "b", kind: "link" },
        { from: "a", to: "c", kind: "child" },
      ]),
    );
    expect(graph.edges).toHaveLength(2);
  });

  it("drops links to pages outside the workspace", () => {
    const graph = buildGraph([page("a")], [{ from: "a", to: "deleted-page" }]);

    expect(graph.edges).toEqual([]);
  });

  it("ignores self links", () => {
    const graph = buildGraph([page("a")], [{ from: "a", to: "a" }]);

    expect(graph.edges).toEqual([]);
  });

  it("counts an edge once even when it is recorded twice", () => {
    const graph = buildGraph(
      [page("a"), page("b")],
      [{ from: "a", to: "b" }, { from: "a", to: "b" }],
    );

    expect(graph.edges).toHaveLength(1);
  });

  it("keeps the most connected pages when over the node budget", () => {
    const pages = ["a", "b", "c", "d"].map((id) => page(id));
    const graph = buildGraph(pages, [{ from: "c", to: "d" }], 2);

    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["c", "d"]);
  });

  it("sizes nodes by how connected they are", () => {
    const graph = buildGraph([page("a"), page("b"), page("c")], [
      { from: "a", to: "b" },
      { from: "a", to: "c" },
    ]);
    const hub = graph.nodes.find((n) => n.id === "a")!;
    const leaf = graph.nodes.find((n) => n.id === "b")!;

    expect(nodeRadius(hub)).toBeGreaterThan(nodeRadius(leaf));
  });

  it("starts every node at a distinct position", () => {
    const graph = buildGraph([page("a"), page("b"), page("c")], []);
    const positions = new Set(graph.nodes.map((n) => `${n.x.toFixed(3)},${n.y.toFixed(3)}`));

    expect(positions.size).toBe(3);
  });
});

describe("stepLayout", () => {
  it("pulls linked pages closer than unlinked ones", () => {
    const graph = buildGraph(
      [page("a"), page("b"), page("c"), page("d")],
      [{ from: "a", to: "b" }],
    );
    for (let i = 0; i < 400; i++) stepLayout(graph);

    const at = (id: string) => graph.nodes.find((n) => n.id === id)!;
    const linkedDistance = Math.hypot(at("a").x - at("b").x, at("a").y - at("b").y);
    const unlinkedDistance = Math.hypot(at("c").x - at("d").x, at("c").y - at("d").y);

    expect(linkedDistance).toBeLessThan(unlinkedDistance);
  });

  it("settles to finite coordinates", () => {
    const graph = buildGraph(
      Array.from({ length: 30 }, (_, i) => page(`p${i}`)),
      Array.from({ length: 29 }, (_, i) => ({ from: `p${i}`, to: `p${i + 1}` })),
    );
    for (let i = 0; i < 500; i++) stepLayout(graph);

    for (const node of graph.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
    }
  });

  it("separates nodes that start on top of each other", () => {
    const graph = buildGraph([page("a"), page("b")], []);
    graph.nodes.forEach((node) => {
      node.x = 0;
      node.y = 0;
    });

    stepLayout(graph);

    const [a, b] = graph.nodes;
    expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeGreaterThan(0);
  });
});

describe("graphBounds", () => {
  it("returns a usable box for an empty graph", () => {
    expect(graphBounds([])).toEqual({ minX: -1, minY: -1, maxX: 1, maxY: 1 });
  });
});

describe("neighborhoodIds", () => {
  const edges = [
    { from: "a", to: "b" },
    { from: "b", to: "c" },
  ];

  it("includes only the center at depth zero hops treated as depth 1", () => {
    expect(neighborhoodIds("a", edges, 1)).toEqual(new Set(["a", "b"]));
  });

  it("expands two hops from the center", () => {
    expect(neighborhoodIds("a", edges, 2)).toEqual(new Set(["a", "b", "c"]));
  });
});

describe("buildLocalGraph", () => {
  it("limits the graph to the neighborhood around the active page", () => {
    const pages = [page("a"), page("b"), page("c"), page("d")];
    const links = [{ from: "a", to: "b" }, { from: "c", to: "d" }];
    const graph = buildLocalGraph(pages, links, "a", 1);

    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });
});

describe("isOrphan", () => {
  it("treats pages with no incoming links and no parent as orphans", () => {
    expect(isOrphan("a", [{ from: "a", to: "b" }], [page("a"), page("b")])).toBe(true);
    expect(isOrphan("b", [{ from: "a", to: "b" }], [page("a"), page("b")])).toBe(false);
    expect(isOrphan("c", [], [page("c", "a")])).toBe(false);
  });
});

describe("applyGraphFilters", () => {
  it("can hide nodes with no connections", () => {
    const graph = buildGraph([page("a"), page("b"), page("c")], [{ from: "a", to: "b" }]);
    const filtered = applyGraphFilters(
      graph,
      [page("a"), page("b"), page("c")],
      { hideUnlinked: true, orphansOnly: false, tag: null },
      new Map(),
      [{ from: "a", to: "b" }],
    );
    expect(filtered.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
  });

  it("filters nodes by tag", () => {
    const graph = buildGraph([page("a"), page("b")], []);
    const tags = new Map([
      ["a", ["research"]],
      ["b", ["personal"]],
    ]);
    const filtered = applyGraphFilters(
      graph,
      [page("a"), page("b")],
      { hideUnlinked: false, orphansOnly: false, tag: "research" },
      tags,
      [],
    );
    expect(filtered.nodes.map((n) => n.id)).toEqual(["a"]);
  });
});

describe("applySavedPositions", () => {
  it("restores coordinates for nodes that were saved before", () => {
    const graph = buildGraph([page("a"), page("b")], []);
    const restored = applySavedPositions(graph.nodes, { a: { x: 10, y: 20 } });
    expect(restored).toBe(1);
    expect(graph.nodes.find((n) => n.id === "a")).toMatchObject({ x: 10, y: 20, vx: 0, vy: 0 });
  });
});
