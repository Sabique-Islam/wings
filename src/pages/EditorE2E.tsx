import { useCallback, useState } from "react";
import { BlockEditor } from "@/components/BlockEditor/BlockEditor";
import { htmlToMarkdown } from "@/lib/markdown";
import { requestEditorSerialize, type EditorChangePayload } from "@/lib/editorPayload";

const ENTRY_ID = "e2e-harness";

export default function EditorE2E() {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [aiText, setAiText] = useState("");

  const handleChange = useCallback((payload: EditorChangePayload) => {
    // Mirror the app's save path: typing emits JSON, markdown comes from a
    // full serialize requested just before the content would be persisted.
    const storedMarkdown = payload.markdown ?? requestEditorSerialize(ENTRY_ID)?.markdown ?? "";
    const editor = (window as any).__nw_editor;
    const renderedMarkdown = editor ? htmlToMarkdown(editor.getHTML()) : storedMarkdown;
    const requestMarkdown = (window as any).__nw_getMarkdown?.() ?? storedMarkdown;
    setContent(storedMarkdown);
    setPreview(renderedMarkdown);
    setAiText(requestMarkdown);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto border border-border rounded-md min-h-[360px] p-4">
        <BlockEditor entryId={ENTRY_ID} content={content} onChange={handleChange} />
      </div>
      <section aria-label="editor parity" className="sr-only">
        <pre data-testid="stored-text">{content}</pre>
        <pre data-testid="markdown-preview">{preview}</pre>
        <pre data-testid="ai-request-text">{aiText}</pre>
      </section>
    </main>
  );
}
