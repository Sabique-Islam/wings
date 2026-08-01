/**
 * Submit sitemap URLs to IndexNow (Bing and participating engines).
 * Run after deploy or content publish: bun run indexnow
 *
 * Key file must be hosted at https://{host}/{key}.txt
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const HOST = "wings.nopejs.me";
const KEY = "6ab4230d7edd3da701967b8b96d715b3";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

function urlsFromSitemap(sitemapPath: string): string[] {
  const xml = readFileSync(sitemapPath, "utf8");
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  return [...new Set(locs)];
}

async function main() {
  const sitemapPath = resolve(process.cwd(), "public/sitemap.xml");
  if (!existsSync(sitemapPath)) {
    console.error("missing public/sitemap.xml");
    process.exit(1);
  }

  const urlList = urlsFromSitemap(sitemapPath);
  if (urlList.length === 0) {
    console.error("no URLs in sitemap");
    process.exit(1);
  }

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  console.log(`IndexNow: submitting ${urlList.length} URL(s) for ${HOST}`);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log(`IndexNow response: ${res.status} ${res.statusText}`);
  if (text) console.log(text);

  // 200 OK, 202 Accepted are success. 422 often means key/url mismatch.
  if (res.status !== 200 && res.status !== 202) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
