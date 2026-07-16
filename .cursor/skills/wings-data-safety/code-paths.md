# Data Safety — Every Code Path (audit list)

**Rule:** Any new path that reads or writes `entries.content` / `content_json` must be added here and guarded.

---

## LOAD paths

### 1. Server fetch → React state

```
fetchEntries(user.id)                    [Index.tsx ~98]
  → setEntries(data)                     [journal.ts fetchEntries]
  → activeEntry = entries.find(activeId) [Index.tsx ~110]
  → JournalEditor props: content, content_json
```

**Guard:** None at fetch — raw DB rows. Guards apply at merge points below.

### 2. Editor initial content

```
JournalEditor → BlockEditor
  initialContent = resolveInitialEditorContent(content, contentJson)  [BlockEditor.tsx ~39-40, ~69]
  useEditor({ content: initialContent.current })
```

**Guard:** `resolveInitialEditorContent` in `src/lib/editorContent.ts`

**Failure mode:** Empty `{ type: "doc", content: [] }` hides markdown → blank UI → empty autosave.

### 3. Local draft merge (on activeId change)

```
getDraft(activeId)                       [Index.tsx ~239-248]
  → shouldApplyDraft(e.content, draft.markdown)
  → merge draft into entries state if allowed
```

**Guard:** `shouldApplyDraft` — empty draft must not overwrite non-empty server content.

**Failure mode:** Crashed editor wrote empty draft → user opens page → draft wins in UI → save wipes DB.

### 4. Pending write replay (on login / after fetch)

```
getPendingWrites()                       [Index.tsx ~71-94]
  deps: [user, loading, entries]         ← MUST include entries (needs server content)
  → shouldReplayPendingWrite(serverContent, pw.content)
  → updateEntry OR clearPendingWrite + clearDraft
```

**Guard:** `shouldReplayPendingWrite`

**Failure mode (fixed):** Replay ran before `fetchEntries` → `serverContent === ""` → empty pending wiped DB.

### 5. SharedEntry (read-only public view)

Uses markdown only — does not use `content_json`. OK for read path.

### 6. Collab Y.Doc seed

When collab connects, Y.Doc must be seeded from resolved content — not empty doc.

See **wings-collab** — risk D7 in pitfalls.

---

## SAVE paths

### 1. Primary autosave (solo mode)

```
BlockEditor onUpdate/onBlur
  → serialize (200ms debounce)           [BlockEditor.tsx ~110+]
  → onChange({ markdown, json })
  → Index handleChange                   [Index.tsx ~184]
      → saveDraftThrottled (400ms)       [draftCache.ts]
      → SKIP if entryShared && VITE_COLLAB_URL
      → debounce 1500ms
      → shouldBlockEmptySave(existing.content, toSave.markdown)
      → updateEntry(activeId, toSave)     [journal.ts ~176]
      → clearDraft, clearPendingWrite
      OR queuePendingWrite on failure
```

**Guards:** `shouldBlockEmptySave` before `updateEntry`

**Threshold:** existing markdown ≥ 20 chars AND next markdown empty → block.

### 2. Collab flush (disconnect)

```
nw:collab-flush event                    [Index.tsx ~287+]
  → flushEditor()
  → shouldBlockEmptySave                 ← REQUIRED (same as autosave)
  → updateEntry
```

**Guard:** Same as autosave — never bypass.

### 3. Pending queue (offline retry)

Same as path 1 but triggered from failed save or replay on login. Must pass `shouldReplayPendingWrite`.

### 4. Draft-only (localStorage)

```
saveDraftThrottled / saveDraft / flushEditor on visibilitychange
```

Drafts are cache. Never call `updateEntry` directly from draftCache — only Index paths above.

### 5. Title save

```
updateEntryTitle(id, title)              [Index.tsx ~224-236]
```

Does not touch body content — safe.

### 6. createEntry

New rows with empty or initial content — safe (no overwrite).

### 7. Import

`createEntry` for new rows — does not overwrite existing.

---

## updateEntry call sites (complete list)

| Location | Guard | Notes |
|----------|-------|-------|
| Index handleChange debounce | `shouldBlockEmptySave` | Primary autosave |
| Index pending replay | `shouldReplayPendingWrite` | After entries loaded |
| Index collab flush | `shouldBlockEmptySave` | On disconnect |

**There is no other client `updateEntry` caller.** AI edits go through editor serialize → handleChange.

---

## Dual-write contract

Every intentional body save writes **both**:

```ts
.update({ content: payload.markdown, content_json: payload.json })
```

Never update only one field from the client except migration scripts with service role + explicit review.

---

## localStorage keys

| Key | Written by | Cleared by |
|-----|------------|------------|
| `wings_draft_{id}` | saveDraftThrottled | clearDraft on successful save |
| `wings_draft_json_{id}` | saveDraftThrottled | clearDraft |
| `wings_pending_{id}` | queuePendingWrite | clearPendingWrite on success |

---

## Adding a new save path — mandatory checklist

1. Add row to this file
2. Call `shouldBlockEmptySave` (or equivalent) before `updateEntry`
3. Add test in `editorContent.test.ts` if new guard logic
4. Update **wings-ship-gate** Tier 0 if user-facing
5. Run `bun run recover:entries` before/after deploy

---

## Detection queries (Supabase)

```sql
-- Rows where markdown exists but JSON is empty (fixable by recover script)
SELECT id, title, length(content) AS md_len
FROM entries
WHERE length(trim(content)) > 0
  AND (content_json IS NULL OR content_json->'content' = '[]'::jsonb);

-- Rows fully wiped (need PITR)
SELECT id, title, created_at
FROM entries
WHERE length(trim(coalesce(content, ''))) = 0
  AND (content_json IS NULL OR content_json->'content' = '[]'::jsonb);
```
