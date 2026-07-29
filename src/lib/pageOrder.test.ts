import { describe, it, expect } from "vitest";
import type { Entry } from "./journal";
import { isDescendantOf, reorderSiblings, sortSiblings } from "./pageOrder";

function sibling(id: string, created_at: string, sort_order: number | null = null) {
  return { id, created_at, sort_order };
}

function page(id: string, parent_id: string | null): Entry {
  return { id, parent_id } as Entry;
}

describe("sortSiblings", () => {
  it("puts the newest page first while nothing has been dragged", () => {
    const order = sortSiblings([
      sibling("old", "2026-01-01"),
      sibling("new", "2026-03-01"),
      sibling("middle", "2026-02-01"),
    ]);
    expect(order.map((e) => e.id)).toEqual(["new", "middle", "old"]);
  });

  it("follows the dragged arrangement once one exists", () => {
    const order = sortSiblings([
      sibling("a", "2026-01-01", 2),
      sibling("b", "2026-03-01", 0),
      sibling("c", "2026-02-01", 1),
    ]);
    expect(order.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });

  it("shows a page created after a drag at the top of the list", () => {
    const order = sortSiblings([
      sibling("first", "2026-01-01", 0),
      sibling("second", "2026-01-02", 1),
      sibling("brand-new", "2026-04-01"),
    ]);
    expect(order.map((e) => e.id)).toEqual(["brand-new", "first", "second"]);
  });
});

describe("reorderSiblings", () => {
  const siblings = [
    sibling("a", "2026-03-01"),
    sibling("b", "2026-02-01"),
    sibling("c", "2026-01-01"),
  ];

  it("moves a page above the one it was dropped on", () => {
    expect(reorderSiblings(siblings, "c", "a", "before")).toEqual([
      { id: "c", sort_order: 0 },
      { id: "a", sort_order: 1 },
      { id: "b", sort_order: 2 },
    ]);
  });

  it("moves a page below the one it was dropped on", () => {
    expect(reorderSiblings(siblings, "a", "c", "after")).toEqual([
      { id: "b", sort_order: 0 },
      { id: "c", sort_order: 1 },
      { id: "a", sort_order: 2 },
    ]);
  });

  it("renumbers every sibling so repeated drags never run out of room", () => {
    let list = siblings;
    for (let i = 0; i < 50; i += 1) {
      const order = reorderSiblings(list, "a", "c", i % 2 === 0 ? "after" : "before");
      const byId = new Map(order.map((row) => [row.id, row.sort_order]));
      list = list.map((entry) => ({ ...entry, sort_order: byId.get(entry.id) ?? entry.sort_order }));
    }
    expect(list.every((entry) => Number.isInteger(entry.sort_order))).toBe(true);
  });

  it("does nothing when a page is dropped on itself or on a stranger", () => {
    expect(reorderSiblings(siblings, "a", "a", "before")).toEqual([]);
    expect(reorderSiblings(siblings, "a", "zzz", "before")).toEqual([]);
  });
});

describe("isDescendantOf", () => {
  const entries = [page("root", null), page("child", "root"), page("grandchild", "child")];

  it("catches a page being dropped into its own subtree", () => {
    expect(isDescendantOf(entries, "root", "grandchild")).toBe(true);
  });

  it("allows a move between unrelated branches", () => {
    expect(isDescendantOf(entries, "grandchild", "root")).toBe(false);
  });
});
