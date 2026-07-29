import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Check, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  createEntryComment,
  deleteEntryComment,
  fetchEntryComments,
  resolveEntryComment,
  type EntryComment,
} from "@/lib/comments";

interface Props {
  entryId: string;
  userId: string;
  editable: boolean;
}

export function CommentsPanel({ entryId, userId, editable }: Props) {
  const [comments, setComments] = useState<EntryComment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setComments(await fetchEntryComments(entryId));
    } catch {
      toast.error("Couldn't load comments");
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const open = comments.filter((c) => !c.resolved_at);
  const resolved = comments.filter((c) => c.resolved_at);
  const visible = showResolved ? comments : open;

  const submit = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const created = await createEntryComment(entryId, userId, draft);
      setComments((prev) => [...prev, created]);
      setDraft("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't post comment");
    } finally {
      setBusy(false);
    }
  };

  const resolve = async (id: string) => {
    try {
      await resolveEntryComment(id);
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, resolved_at: new Date().toISOString() } : c)),
      );
    } catch {
      toast.error("Couldn't resolve comment");
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteEntryComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("Couldn't delete comment");
    }
  };

  return (
    <section className="mt-10 pt-4 border-t border-border-subtle">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-mono flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          {open.length} comment{open.length === 1 ? "" : "s"}
        </h2>
        {resolved.length > 0 && (
          <button
            type="button"
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground"
            onClick={() => setShowResolved((v) => !v)}
          >
            {showResolved ? "hide resolved" : `show ${resolved.length} resolved`}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {visible.map((comment) => (
            <li
              key={comment.id}
              className={`rounded-md border border-border-subtle px-3 py-2 text-sm ${
                comment.resolved_at ? "opacity-60" : ""
              }`}
            >
              <p className="whitespace-pre-wrap text-foreground/90">{comment.body}</p>
              <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                <span>{new Date(comment.created_at).toLocaleString()}</span>
                {editable && !comment.resolved_at && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 hover:text-foreground"
                    onClick={() => void resolve(comment.id)}
                  >
                    <Check className="h-3 w-3" /> resolve
                  </button>
                )}
                {(comment.author_id === userId || editable) && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 hover:text-destructive"
                    onClick={() => void remove(comment.id)}
                  >
                    <Trash2 className="h-3 w-3" /> delete
                  </button>
                )}
              </div>
            </li>
          ))}
          {!loading && visible.length === 0 && (
            <li className="text-xs text-muted-foreground italic">No comments yet</li>
          )}
        </ul>
      )}

      {editable && (
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a comment… Use @ to mention a page in the editor."
            rows={2}
            className="flex-1 resize-none rounded-md border border-border-subtle bg-transparent px-2 py-1.5 text-sm outline-none focus:border-border"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="button"
            disabled={busy || !draft.trim()}
            onClick={() => void submit()}
            className="self-end inline-flex items-center gap-1 rounded-md bg-accent-strong text-accent-strong-foreground px-2.5 py-1.5 text-xs font-mono disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Post
          </button>
        </div>
      )}
    </section>
  );
}
