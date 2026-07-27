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
}

export interface LinkIndexResponse {
  entryId: string;
  outgoing: string[];
  unresolved: string[];
}

self.onmessage = ({ data }: MessageEvent<LinkIndexRequest>) => {
  const { outgoing, unresolved } = extractLinks(data.doc);
  const response: LinkIndexResponse = { entryId: data.entryId, outgoing, unresolved };
  self.postMessage(response);
};
