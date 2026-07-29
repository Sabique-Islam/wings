import { describe, it, expect } from "vitest";
import { EMPTY_PROPERTIES, isEmptyProperties, normalizeProperties, normalizeTag } from "./entryProperties";

describe("normalizeProperties", () => {
  it("reads a well-formed value back unchanged", () => {
    expect(normalizeProperties({ status: "Done", date: "2026-07-29", tags: ["infra"] })).toEqual({
      status: "Done",
      date: "2026-07-29",
      tags: ["infra"],
    });
  });

  it("treats a page saved before properties existed as empty", () => {
    expect(normalizeProperties(undefined)).toEqual(EMPTY_PROPERTIES);
    expect(normalizeProperties({})).toEqual(EMPTY_PROPERTIES);
  });

  it("drops a status that is not one of the offered options", () => {
    expect(normalizeProperties({ status: "Shipped" }).status).toBeNull();
  });

  it("drops a date that is not an ISO day", () => {
    expect(normalizeProperties({ date: "29 July 2026" }).date).toBeNull();
  });

  it("normalizes and de-duplicates tags so they match in-text hashtags", () => {
    expect(normalizeProperties({ tags: ["#Infra", "infra", "Deep Work", 7] }).tags).toEqual([
      "infra",
      "deep-work",
    ]);
  });
});

describe("normalizeTag", () => {
  it("strips the hash, lowercases, and joins words with a dash", () => {
    expect(normalizeTag("  #Deep Work ")).toBe("deep-work");
  });
});

describe("isEmptyProperties", () => {
  it("is true only when nothing is set", () => {
    expect(isEmptyProperties(EMPTY_PROPERTIES)).toBe(true);
    expect(isEmptyProperties({ status: null, date: null, tags: ["infra"] })).toBe(false);
  });
});
