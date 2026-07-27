import { describe, expect, it } from "vitest";
import { shouldSnapshot } from "./entryVersions";

const NOW = 1_700_000_000_000;
const TWO_MINUTES = 2 * 60 * 1000;

describe("shouldSnapshot", () => {
  it("keeps the first save of an entry", () => {
    expect(shouldSnapshot(null, "# Notes", NOW)).toBe(true);
  });

  it("never snapshots empty content", () => {
    expect(shouldSnapshot(null, "   \n", NOW)).toBe(false);
  });

  it("skips a save that changed nothing", () => {
    const previous = { content: "# Notes", at: NOW - TWO_MINUTES * 10 };
    expect(shouldSnapshot(previous, "# Notes", NOW)).toBe(false);
  });

  it("skips rapid autosaves so history stays readable", () => {
    const previous = { content: "# Notes", at: NOW - 3000 };
    expect(shouldSnapshot(previous, "# Notes and more", NOW)).toBe(false);
  });

  it("keeps a changed save once the interval has passed", () => {
    const previous = { content: "# Notes", at: NOW - TWO_MINUTES };
    expect(shouldSnapshot(previous, "# Notes and more", NOW)).toBe(true);
  });
});
