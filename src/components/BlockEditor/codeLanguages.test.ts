import { describe, expect, it } from "vitest";
import {
  formatCodeLanguageLabel,
  getCodeBlockLanguages,
  normalizeCodeLanguage,
} from "./codeLanguages";

describe("codeLanguages", () => {
  it("includes C and C++ in the language picker", () => {
    const languages = getCodeBlockLanguages();
    expect(languages).toContain("c");
    expect(languages).toContain("cpp");
    expect(languages.length).toBeGreaterThan(100);
  });

  it("normalizes common fence aliases", () => {
    expect(normalizeCodeLanguage("c++")).toBe("cpp");
    expect(normalizeCodeLanguage("C#")).toBe("csharp");
    expect(normalizeCodeLanguage("py")).toBe("python");
    expect(normalizeCodeLanguage(null)).toBe("plaintext");
  });

  it("formats friendly labels for common languages", () => {
    expect(formatCodeLanguageLabel("cpp")).toBe("C++");
    expect(formatCodeLanguageLabel("c")).toBe("C");
    expect(formatCodeLanguageLabel("haskell")).toBe("haskell");
  });
});
