import { describe, it, expect } from "vitest";
import { buildGraph, graphBounds, nodeRadius, stepLayout, type GraphSource } from "./graphLayout";

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
