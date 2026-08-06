import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle,
          }),
        }),
      }),
    }),
  },
}));

import { updateEntry } from "./journal";

describe("updateEntry", () => {
  beforeEach(() => {
    maybeSingle.mockReset();
  });

  it("throws when RLS blocks the update (0 rows returned)", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      updateEntry("entry-id", { markdown: "hello", json: { type: "doc", content: [] } }),
    ).rejects.toThrow(/did not apply/i);
  });

  it("resolves when a row is updated", async () => {
    maybeSingle.mockResolvedValue({ data: { id: "entry-id" }, error: null });
    await expect(
      updateEntry("entry-id", { markdown: "hello", json: { type: "doc", content: [] } }),
    ).resolves.toBeUndefined();
  });

  it("propagates Supabase errors", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: "row-level security" } });
    await expect(
      updateEntry("entry-id", { markdown: "hello", json: { type: "doc", content: [] } }),
    ).rejects.toEqual({ message: "row-level security" });
  });
});
