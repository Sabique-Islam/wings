/**
 * One-off recovery: fix entries where markdown `content` survived but empty
 * `content_json` hides it in the editor, and report rows that may need PITR.
 *
 * Usage (requires SUPABASE_SERVICE_ROLE_KEY + VITE_SUPABASE_URL in .env):
 *   bun run scripts/recover-entries.ts
 *   bun run scripts/recover-entries.ts --apply
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const apply = process.argv.includes("--apply");

function loadEnv(): Record<string, string> {
  const path = resolve(process.cwd(), ".env");
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

function isEmptyJsonDoc(json: unknown): boolean {
  if (!json || typeof json !== "object") return true;
  const doc = json as { type?: string; content?: unknown[] };
  if (doc.type !== "doc") return true;
  if (!doc.content?.length) return true;
  if (
    doc.content.length === 1 &&
    (doc.content[0] as { type?: string; content?: unknown[] })?.type === "paragraph"
  ) {
    const inner = (doc.content[0] as { content?: unknown[] }).content;
    return !inner?.length;
  }
  return false;
}

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const admin = createClient(url, key);
  const { data: entries, error } = await admin
    .from("entries")
    .select("id, title, content, content_json, deleted_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Fetch failed:", error.message);
    process.exit(1);
  }

  const fixable: string[] = [];
  const recoverableFromMarkdown: string[] = [];
  const likelyLost: string[] = [];

  for (const row of entries ?? []) {
    const content = (row.content ?? "").trim();
    const json = row.content_json;
    const jsonEmpty = isEmptyJsonDoc(json);

    if (content.length > 0 && jsonEmpty) {
      fixable.push(row.id);
      recoverableFromMarkdown.push(`${row.id}  "${row.title || "Untitled"}"  (${content.length} chars markdown)`);
    } else if (content.length === 0 && !jsonEmpty) {
      // JSON may still hold the doc — app should read it after resolveInitialContent fix
      recoverableFromMarkdown.push(`${row.id}  "${row.title || "Untitled"}"  (json only)`);
    } else if (content.length === 0 && jsonEmpty) {
      likelyLost.push(`${row.id}  "${row.title || "Untitled"}"`);
    }
  }

  console.log(`\nScanned ${entries?.length ?? 0} entries`);
  console.log(`\nFixable (clear empty content_json, keep markdown): ${fixable.length}`);
  recoverableFromMarkdown.forEach((line) => console.log("  •", line));
  console.log(`\nLikely need Supabase point-in-time restore (both empty): ${likelyLost.length}`);
  likelyLost.forEach((line) => console.log("  •", line));

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to clear empty content_json on fixable rows.");
    return;
  }

  if (fixable.length === 0) {
    console.log("\nNothing to update.");
    return;
  }

  const { error: updateError } = await admin
    .from("entries")
    .update({ content_json: null })
    .in("id", fixable);

  if (updateError) {
    console.error("Update failed:", updateError.message);
    process.exit(1);
  }

  console.log(`\nUpdated ${fixable.length} entries (content_json → null). Users should see markdown again after deploy.`);
}

main();
