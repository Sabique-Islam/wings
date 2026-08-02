import { all, createLowlight } from "lowlight";

/** Highlight.js grammars for every language lowlight ships. */
export const codeBlockLowlight = createLowlight(all);

const LANGUAGE_ALIASES: Record<string, string> = {
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  js: "javascript",
  ts: "typescript",
  py: "python",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  md: "markdown",
  objc: "objectivec",
  "objective-c": "objectivec",
};

const LANGUAGE_LABELS: Record<string, string> = {
  c: "C",
  cpp: "C++",
  csharp: "C#",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  plaintext: "Plain text",
};

/** Map fence tags like `c++` to highlight.js ids like `cpp`. */
export function normalizeCodeLanguage(language: string | null | undefined): string {
  const raw = (language ?? "").trim().toLowerCase();
  if (!raw) return "plaintext";
  return LANGUAGE_ALIASES[raw] ?? raw;
}

export function formatCodeLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

let cachedLanguages: string[] | null = null;

/** All registered languages, plain text first, then alphabetical. */
export function getCodeBlockLanguages(): string[] {
  if (cachedLanguages) return cachedLanguages;
  const registered = codeBlockLowlight.listLanguages();
  const sorted = registered
    .filter((language) => language !== "plaintext")
    .sort((a, b) => formatCodeLanguageLabel(a).localeCompare(formatCodeLanguageLabel(b)));
  cachedLanguages = ["plaintext", ...sorted];
  return cachedLanguages;
}

/** Language picker options, preserving unknown attrs from imported markdown. */
export function getCodeBlockLanguageOptions(currentLanguage: string): string[] {
  const languages = getCodeBlockLanguages();
  if (!currentLanguage || languages.includes(currentLanguage)) return languages;
  return [currentLanguage, ...languages];
}
