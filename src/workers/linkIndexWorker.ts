// Rebuilds link rows off the main thread.
//
// TipTap JSON is structured-cloneable and the extraction needs no DOM, so this
// work leaves the UI thread entirely. Jobs arrive in batches: one page while
// typing, every page on a full reindex.

import { runLinkIndexJobs, type LinkIndexJob } from "@/lib/linkIndexJobs";

self.onmessage = ({ data }: MessageEvent<LinkIndexJob[]>) => {
  self.postMessage(runLinkIndexJobs(data));
};
