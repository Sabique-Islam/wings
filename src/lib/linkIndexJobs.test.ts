import { describe, it, expect } from "vitest";
import { runLinkIndexJobs } from "./linkIndexJobs";

describe("runLinkIndexJobs", () => {
  it("returns one result per job, tagged with its sequence number", () => {
    const results = runLinkIndexJobs([
      { entryId: "a", seq: 1, doc: null, markdown: "see [Notes](#page:page-b)" },
      { entryId: "b", seq: 2, doc: null, markdown: "nothing here" },
    ]);

    expect(results).toEqual([
      {
        entryId: "a",
        seq: 1,
        outgoing: ["page-b"],
        unresolved: [],
        tags: [],
        contexts: { "page-b": "see Notes" },
      },
      { entryId: "b", seq: 2, outgoing: [], unresolved: [], tags: [], contexts: {} },
    ]);
  });

  it("finds links in markdown for pages that have no saved editor json", () => {
    const [result] = runLinkIndexJobs([
      { entryId: "a", seq: 1, doc: null, markdown: "![Roadmap](#page:page-x) and [Notes](#page:page-y)" },
    ]);
    expect(result.outgoing).toEqual(["page-x", "page-y"]);
  });
});
