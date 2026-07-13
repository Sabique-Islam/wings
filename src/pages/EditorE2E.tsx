import { useCallback, useState } from "react";
import { BlockEditor } from "@/components/BlockEditor/BlockEditor";
import { htmlToMarkdown } from "@/lib/markdown";

export default function EditorE2E() {
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [aiText, setAiText] = useState("");

  const handleChange = useCallback((markdown: string) => {
    const editor = (window as any).__nw_editor;
    const renderedMarkdown = editor ? htmlToMarkdown(editor.getHTML()) : markdown;
    const requestMarkdown = (window as any).__nw_getMarkdown?.() ?? markdown;
    setContent(markdown);
    setPreview(renderedMarkdown);
    setAiText(requestMarkdown);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-3xl mx-auto border border-border rounded-md min-h-[360px] p-4">
        <BlockEditor content={content} onChange={handleChange} />
      </div>
      <section aria-label="editor parity" className="sr-only">
        <pre data-testid="stored-text">{content}</pre>
        <pre data-testid="markdown-preview">{preview}</pre>
        <pre data-testid="ai-request-text">{aiText}</pre>
      </section>
    </main>
  );
}