/// <reference path="../deno.ns.d.ts" />

import { allowedAppOrigins } from "./origins.ts";

/** CORS headers scoped to the request's Origin when it's allowlisted. */
export function corsHeadersFor(req: Request): Record<string, string> {
  const origins = allowedAppOrigins();
  const origin = req.headers.get("Origin") || "";
  const allowed = origins.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : (origins[0] ?? ""),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
