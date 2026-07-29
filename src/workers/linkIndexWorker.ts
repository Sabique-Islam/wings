// Rebuilds one page's link row off the main thread.
//
// TipTap JSON is structured-cloneable and the extraction needs no DOM, so this
// work leaves the UI thread entirely. Requests are keyed by entry so a stale
// reply can be discarded by the client.

import { extractLinks } from "@/lib/linkExtraction";
import type { JSONContent } from "@tiptap/core";

export interface LinkIndexRequest {
  entryId: string;
  doc: JSONContent;
  markdown?: string;
}

export interface LinkIndexResponse {
  entryId: string;
  outgoing: string[];
  unresolved: string[];
  tags: string[];
}

self.onmessage = ({ data }: MessageEvent<LinkIndexRequest>) => {
  const { outgoing, unresolved, tags } = extractLinks(data.doc, data.markdown);
  const response: LinkIndexResponse = { entryId: data.entryId, outgoing, unresolved, tags };
  self.postMessage(response);
};
