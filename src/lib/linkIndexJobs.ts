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
}

export interface LinkIndexResult {
  entryId: string;
  seq: number;
  outgoing: string[];
  unresolved: string[];
  tags: string[];
}

export function runLinkIndexJobs(jobs: LinkIndexJob[]): LinkIndexResult[] {
  return jobs.map((job) => ({
    entryId: job.entryId,
    seq: job.seq,
    ...extractLinks(job.doc, job.markdown),
  }));
}
