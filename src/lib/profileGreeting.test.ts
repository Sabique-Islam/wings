import { describe, it, expect } from "vitest";
import { resolveGreetingName } from "./profile";

describe("resolveGreetingName", () => {
  it("prefers display_name over username and email", () => {
    expect(
      resolveGreetingName(
        { display_name: "Ada", username: "lovelace" },
        "ada.lovelace@example.com",
      ),
    ).toBe("Ada");
  });

  it("falls back to username when display_name is empty", () => {
    expect(
      resolveGreetingName(
        { display_name: "  ", username: "lovelace" },
        "ada.lovelace@example.com",
      ),
    ).toBe("lovelace");
    expect(
      resolveGreetingName(
        { display_name: null, username: "lovelace" },
        "ada.lovelace@example.com",
      ),
    ).toBe("lovelace");
  });

  it("falls back to email local-part when profile is missing", () => {
    expect(resolveGreetingName(null, "ada.lovelace@example.com")).toBe("Ada");
    expect(resolveGreetingName({ display_name: null, username: null }, "bob_smith@x.com")).toBe(
      "Bob",
    );
  });

  it("returns there when nothing is available", () => {
    expect(resolveGreetingName(null, null)).toBe("there");
    expect(resolveGreetingName(null, undefined)).toBe("there");
  });
});
