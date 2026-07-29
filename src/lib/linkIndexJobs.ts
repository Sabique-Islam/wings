// The unit of work the link indexer performs, shared by the worker and the
// main-thread fallback.
//
// Each job carries a sequence number so a reply that arrives after a newer edit
// can be discarded instead of reintroducing stale links.

import type { JSONContent } from "@tiptap/core";
import { extractLinks } from "./linkExtraction";

export interface LinkIndexJob {
  entryId: string;
  seq: number;
  doc: JSONContent | null;
  markdown?: string;
  /** Page-property tags, which live outside the content the parser sees. */
  tags?: string[];
}

export interface LinkIndexResult {
  entryId: string;
  seq: number;
  outgoing: string[];
  unresolved: string[];
  tags: string[];
  contexts: Record<string, string>;
}

export function runLinkIndexJobs(jobs: LinkIndexJob[]): LinkIndexResult[] {
  return jobs.map((job) => {
    const links = extractLinks(job.doc, job.markdown);
    return {
      entryId: job.entryId,
      seq: job.seq,
      ...links,
      tags: Array.from(new Set([...links.tags, ...(job.tags ?? [])])).sort(),
    };
  });
}
