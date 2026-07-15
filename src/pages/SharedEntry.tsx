import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BlockEditor } from "@/components/BlockEditor/BlockEditor";
import { AsciiSpinner } from "@/components/AsciiAnimation";
import { Seo } from "@/components/Seo";

export default function SharedEntry() {
  const { token } = useParams<{ token: string }>();
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    // Share tokens are 32 hex chars. Reject anything else before hitting the DB.
    if (!/^[a-f0-9]{32}$/.test(token)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const fetchShared = async () => {
      try {
        const { data, error } = await supabase.rpc("get_shared_entry", { _token: token });
        const row = Array.isArray(data) ? data[0] : data;
        if (!error && row) {
          setContent(row.content);
          setTitle(row.title || "");
          setDate(new Date(row.created_at).toLocaleDateString("default", { day: "numeric", month: "long", year: "numeric" }));
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    };
    fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <AsciiSpinner />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4 px-4 text-center">
        <pre className="text-muted-foreground/30 font-mono text-xs">
{`  ___  
 / _ \\ 
| | | |
| |_| |
 \\___/ `}
        </pre>
        <p className="text-xs text-muted-foreground font-mono">this page doesn't exist or is no longer shared</p>
        <a href="/" className="text-[10px] text-muted-foreground/50 hover:text-foreground font-mono transition-colors">
          ← wings
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title={title || "shared note"} path={`/s/${token ?? ""}`} noIndex />
      <header className="h-12 flex items-center px-4 sm:px-6 border-b border-border justify-between gap-4">
        <a href="/" className="text-[10px] text-muted-foreground/50 hover:text-foreground font-mono transition-colors uppercase tracking-wider shrink-0">
          wings
        </a>
        {title && (
          <span className="text-xs text-foreground font-mono truncate min-w-0">{title}</span>
        )}
        <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0 hidden sm:block">{date}</span>
      </header>
      <div className="max-w-2xl mx-auto px-2 sm:px-0">
        <BlockEditor
          content={content || ""}
          onChange={() => {}}
          editable={false}
        />
      </div>
    </div>
  );
}
