import { useState, useRef, useCallback, useEffect } from "react";
import { Entry, ShareRole } from "@/lib/journal";
import { Trash2, PanelLeft, Download, Pin, PinOff, FilePlus, Keyboard, Sparkles, PenTool, Hash, Upload, FileJson, FileText } from "lucide-react";
import { EmptyStateAscii } from "@/components/AsciiAnimation";
import { BlockEditor } from "@/components/BlockEditor/BlockEditor";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ShareMenu } from "@/components/ShareMenu";
import { exportSingleEntry, exportSingleAsJson, importFile } from "@/lib/export";
import { toast } from "sonner";
import { uploadImage } from "@/lib/imageUpload";
import { InlineAIMenu } from "@/components/InlineAIMenu";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { rememberDrawingSnapshot } from "@/lib/ai/excalidrawContext";
import { Check, CloudOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  entry: Entry | null;
  userId: string;
  onChange: (content: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  breadcrumbTrail: Entry[];
  onNavigate: (id: string | null) => void;
  onNewSubpage: (parentId: string) => void;
  onUpdateEntry: (entry: Entry) => void;
  userRole: ShareRole;
  onNewSubpageWithTitle: (parentId: string, title: string) => Promise<void>;
  onOpenAI: () => void;
  onImported?: () => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function readingTime(words: number): string {
  const mins = Math.ceil(words / 200);
  return mins < 1 ? "<1 min" : `${mins} min`;
}

export function JournalEditor({ entry, userId, onChange, onDelete, onTogglePin, sidebarOpen, onToggleSidebar, breadcrumbTrail, onNavigate, onNewSubpage, onUpdateEntry, userRole, onNewSubpageWithTitle, onOpenAI, onImported, saveStatus = "idle" }: Props) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      let total = 0;
      for (const f of files) {
        const created = await importFile(f, userId);
        total += created.length;
      }
      toast.success(`imported ${total} entr${total === 1 ? "y" : "ies"}`);
      onImported?.();
    } catch (err: any) {
      toast.error(err?.message || "import failed");
    } finally {
      e.target.value = "";
    }
  }, [userId, onImported]);

  const [uploading, setUploading] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(() => {
    return localStorage.getItem("nw:lineNumbers") !== "0";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("nw:lineNumbers", showLineNumbers ? "1" : "0");
  }, [showLineNumbers]);

  // Listen for "edit drawing" requests from the inline node view
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.sceneId as string | undefined;
      if (!id) return;
      setEditingSceneId(id);
      setDrawingOpen(true);
    };
    window.addEventListener("nw:editDrawing", handler);
    return () => window.removeEventListener("nw:editDrawing", handler);
  }, []);

  // Free-canvas / layout-bridge was removed in favor of in-flow markdown editing.
  // Excalidraw is used for any free-form drawing/canvas needs.


  const words = entry ? wordCount(entry.content) : 0;
  const canEdit = userRole === "owner" || userRole === "admin" || userRole === "editor";
  const canDelete = userRole === "owner" || userRole === "admin";
  const canManage = userRole === "owner" || userRole === "admin";

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") || !entry) return;
    setUploading(true);
    const url = await uploadImage(file, userId);
    if (url) {
      if ((window as any).__nw_insertImage) {
        (window as any).__nw_insertImage(url);
      } else {
        onChange(entry.content + `\n![image](${url})\n`);
      }
    }
    setUploading(false);
  }, [userId, entry, onChange]);

  const handleImageUpload = useCallback((file?: File) => {
    if (file) {
      handleImageFile(file);
    } else {
      fileInputRef.current?.click();
    }
  }, [handleImageFile]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await handleImageFile(file);
    }
    e.target.value = "";
  }, [handleImageFile]);

  return (
    <div className="flex-1 flex flex-col h-screen">
      <header className="h-10 flex items-center px-2 sm:px-3 border-b border-border-subtle gap-1 sm:gap-2 shrink-0 overflow-x-auto">
        <button onClick={onToggleSidebar} className="text-muted-foreground hover:text-foreground transition-colors" title="Toggle sidebar (⌘B)">
          <PanelLeft className="h-4 w-4" />
        </button>
        {entry && (
          <>
            <Breadcrumbs trail={breadcrumbTrail} onNavigate={onNavigate} />
            <span className="text-[10px] text-muted-foreground ml-2">
              {new Date(entry.created_at).toLocaleDateString("default", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            <span className="text-[10px] text-muted-foreground/50 ml-2">
              {words}w · {readingTime(words)}
            </span>
            {uploading && (
              <span className="text-[10px] text-muted-foreground/50 ml-2 animate-pulse">uploading…</span>
            )}
            {saveStatus === "saving" && (
              <span className="text-[10px] text-muted-foreground/60 ml-2 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-pulse" />
                saving…
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[10px] text-muted-foreground/40 ml-2 font-mono flex items-center gap-1">
                <Check className="h-3 w-3" /> saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-[10px] text-destructive/80 ml-2 font-mono flex items-center gap-1">
                <CloudOff className="h-3 w-3" /> offline · queued
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {userRole === "viewer" && (
                <span className="text-[10px] text-muted-foreground/50 font-mono px-2">view only</span>
              )}
              {userRole === "editor" && (
                <span className="text-[10px] text-muted-foreground/50 font-mono px-2">editor</span>
              )}
              {canManage && <ShareMenu entry={entry} onUpdate={onUpdateEntry} />}
              {canManage && (
                <button
                  onClick={() => onNewSubpage(entry.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Create sub-page"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                </button>
              )}
              {canManage && (
                <button
                  onClick={() => onTogglePin(entry.id, !entry.pinned)}
                  className={`p-1.5 rounded transition-colors ${entry.pinned ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  title={entry.pinned ? "Unpin" : "Pin entry"}
                >
                  {entry.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => { setEditingSceneId(null); setDrawingOpen(true); }}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Open drawing canvas"
                >
                  <PenTool className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowLineNumbers((s) => !s)}
                className={`p-1.5 rounded transition-colors ${showLineNumbers ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
              >
                <Hash className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onOpenAI}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Open AI assistant (⌘J)"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Import / export"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="font-mono text-xs">
                  <DropdownMenuItem onClick={() => exportSingleEntry(entry)}>
                    <FileText className="h-3.5 w-3.5 mr-2" /> export as markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportSingleAsJson(entry)}>
                    <FileJson className="h-3.5 w-3.5 mr-2" /> export as JSON
                  </DropdownMenuItem>
                  {canManage && (
                    <DropdownMenuItem onClick={() => importInputRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-2" /> import file(s)…
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <input
                ref={importInputRef}
                type="file"
                accept=".md,.markdown,.json,text/markdown,application/json"
                multiple
                className="hidden"
                onChange={handleImport}
              />
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("nw:shortcuts"))}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Keyboard shortcuts (⌘?)"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </button>
              {canDelete && (
                <button
                  onClick={() => onDelete(entry.id)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </header>

      <div className={`flex-1 overflow-y-auto relative ${showLineNumbers ? "nw-line-numbers" : ""}`}>
        {!entry ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <EmptyStateAscii />
            <p className="text-[10px] text-ink-3 font-mono">⌘K palette · ⌘N create · ⌘J for AI</p>
          </div>
        ) : (
          <>
            <BlockEditor
              key={entry.id}
              content={entry.content}
              onChange={onChange}
              onImageUpload={canEdit ? handleImageUpload : undefined}
              onLinkPage={canEdit ? () => window.dispatchEvent(new CustomEvent("nw:linkpage")) : undefined}
              onNewPage={canEdit ? (title: string) => onNewSubpageWithTitle(entry.id, title) : undefined}
              onAskAI={canEdit ? onOpenAI : undefined}
              editable={canEdit}
            />
            <InlineAIMenu editor={(window as any).__nw_editor} />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>
      {entry && (
        <DrawingCanvas
          open={drawingOpen}
          onClose={() => { setDrawingOpen(false); setEditingSceneId(null); }}
          userId={userId}
          sceneId={editingSceneId}
          entryId={entry.id}
          onSaved={({ sceneId, imageUrl, isNew }) => {
            const editor = (window as any).__nw_editor;
            if (imageUrl) rememberDrawingSnapshot(sceneId, imageUrl);
            if (isNew) {
              if (editor && editor.commands.insertDrawing) {
                editor.chain().focus("end").insertDrawing({ sceneId, imageUrl }).run();
              } else if (imageUrl) {
                onChange(entry.content + `\n\n![drawing](${imageUrl})\n`);
              }
            } else {
              // broadcast so existing node views can refresh their imageUrl
              window.dispatchEvent(new CustomEvent("nw:drawingUpdated", { detail: { sceneId, imageUrl } }));
            }
          }}
        />
      )}
    </div>
  );
}
