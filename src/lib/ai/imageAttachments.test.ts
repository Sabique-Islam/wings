import { describe, expect, it } from "vitest";
import { isAllowedImageFile } from "./imageAttachments";

describe("isAllowedImageFile", () => {
  it("accepts supported image types under the size limit", () => {
    const file = new File(["x"], "photo.png", { type: "image/png" });
    expect(isAllowedImageFile(file)).toBe(true);
  });

  it("rejects unsupported types", () => {
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    expect(isAllowedImageFile(file)).toBe(false);
  });

  it("rejects files over 10 MB", () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    expect(isAllowedImageFile(file)).toBe(false);
  });
});
