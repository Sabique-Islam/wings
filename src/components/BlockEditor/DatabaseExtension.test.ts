import { describe, it, expect } from "vitest";
import { defaultDatabaseAttrs } from "@/components/BlockEditor/DatabaseExtension";

describe("defaultDatabaseAttrs", () => {
  it("starts with name and status columns and two empty rows", () => {
    const attrs = defaultDatabaseAttrs();
    expect(attrs.columns).toHaveLength(2);
    expect(attrs.columns[0].name).toBe("Name");
    expect(attrs.columns[1].type).toBe("status");
    expect(attrs.rows).toHaveLength(2);
  });
});
