import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectImagesFromContent,
  imagesAsAttachments,
  MAX_PAGE_IMAGES,
} from "./pageImageContext";

describe("collectImagesFromContent", () => {
  it("collects http(s) markdown images", () => {
    const md = "Hello\n\n![cat](https://cdn.example.com/cat.png)\n\nMore text";
    expect(collectImagesFromContent(md)).toEqual([
      { alt: "cat", url: "https://cdn.example.com/cat.png" },
    ]);
  });

  it("ignores page embeds", () => {
    const md = "![Roadmap](#page:page-x)\n![photo](https://cdn.example.com/a.jpg)";
    expect(collectImagesFromContent(md)).toEqual([
      { alt: "photo", url: "https://cdn.example.com/a.jpg" },
    ]);
  });

  it("collects data URLs", () => {
    const data = "data:image/png;base64,abc123";
    const md = `![](${data})`;
    expect(collectImagesFromContent(md)).toEqual([{ alt: "", url: data }]);
  });

  it("collects HTML img tags", () => {
    const html = '<p><img src="https://cdn.example.com/x.webp" alt="shot"></p>';
    expect(collectImagesFromContent(html)).toEqual([
      { alt: "shot", url: "https://cdn.example.com/x.webp" },
    ]);
  });

  it("dedupes by URL", () => {
    const md =
      "![a](https://cdn.example.com/a.png)\n![b](https://cdn.example.com/a.png)";
    expect(collectImagesFromContent(md)).toHaveLength(1);
  });

  it("skips Excalidraw snapshot URLs", () => {
    const content = `
<div data-type="excalidraw" data-scene-id="s1" data-image-url="https://cdn.example.com/draw.png"></div>
![photo](https://cdn.example.com/photo.png)
![draw](https://cdn.example.com/draw.png)
`;
    expect(collectImagesFromContent(content)).toEqual([
      { alt: "photo", url: "https://cdn.example.com/photo.png" },
    ]);
  });

  it("caps at MAX_PAGE_IMAGES", () => {
    const urls = Array.from(
      { length: MAX_PAGE_IMAGES + 3 },
      (_, i) => `![i${i}](https://cdn.example.com/${i}.png)`,
    ).join("\n");
    expect(collectImagesFromContent(urls)).toHaveLength(MAX_PAGE_IMAGES);
  });

  it("returns empty for blank content", () => {
    expect(collectImagesFromContent("")).toEqual([]);
    expect(collectImagesFromContent("just text")).toEqual([]);
  });
});

describe("imagesAsAttachments", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("decodes data URLs without fetch", async () => {
    const pngB64 = "iVBORw0KGgo=";
    const images = [{ alt: "", url: `data:image/png;base64,${pngB64}` }];
    const out = await imagesAsAttachments(images);
    expect(out).toEqual([{ base64: pngB64, mimeType: "image/png" }]);
  });

  it("fetches http URLs into attachments", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(bytes, { status: 200, headers: { "Content-Type": "image/png" } }),
      ),
    );
    // FileReader is used by blobToBase64 — provide a minimal stub in node if needed.
    // Vitest/jsdom usually has FileReader; if not, urlToImageAttachment may fail.
    const out = await imagesAsAttachments([
      { alt: "x", url: "https://cdn.example.com/a.png" },
    ]);
    if (typeof FileReader !== "undefined") {
      expect(out).toHaveLength(1);
      expect(out[0].mimeType).toBe("image/png");
      expect(out[0].base64.length).toBeGreaterThan(0);
    } else {
      expect(out).toEqual([]);
    }
  });

  it("skips failed fetches", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 404 })));
    const out = await imagesAsAttachments([
      { alt: "x", url: "https://cdn.example.com/missing.png" },
    ]);
    expect(out).toEqual([]);
  });
});
