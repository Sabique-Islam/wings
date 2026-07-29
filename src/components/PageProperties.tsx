import { useState, type KeyboardEvent } from "react";
import { CalendarDays, Circle, Hash, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  STATUS_OPTIONS,
  normalizeTag,
  type EntryProperties,
} from "@/lib/entryProperties";

interface Props {
  properties: EntryProperties;
  editable: boolean;
  onChange: (properties: EntryProperties) => void;
}

const STATUS_DOT: Record<string, string> = {
  "Not started": "text-muted-foreground/50",
  "In progress": "text-amber-500",
  Blocked: "text-rose-500",
  Done: "text-emerald-500",
};

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Hash;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 min-h-[26px]">
      <span className="flex items-center gap-1.5 w-[104px] shrink-0 pt-[3px] text-xs text-muted-foreground/70">
        <Icon className="h-3.5 w-3.5 opacity-70" />
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/**
 * The Notion-style property strip between the page title and the editor.
 *
 * Deliberately a fixed set — status, date, tags — rather than a schema builder.
 * Tags feed the same namespace as in-text hashtags so the graph filter sees both.
 */
export function PageProperties({ properties, editable, onChange }: Props) {
  const [draftTag, setDraftTag] = useState("");

  const setStatus = (status: string | null) => onChange({ ...properties, status });
  const setDate = (date: string) => onChange({ ...properties, date: date || null });

  const addTag = () => {
    const tag = normalizeTag(draftTag);
    setDraftTag("");
    if (!tag || properties.tags.includes(tag)) return;
    onChange({ ...properties, tags: [...properties.tags, tag] });
  };

  const removeTag = (tag: string) =>
    onChange({ ...properties, tags: properties.tags.filter((t) => t !== tag) });

  const onTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
      return;
    }
    if (event.key === "Backspace" && !draftTag && properties.tags.length > 0) {
      removeTag(properties.tags[properties.tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-col gap-1 mb-6">
      <Row icon={Circle} label="Status">
        {editable ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-xs px-1.5 py-0.5 -ml-1.5 rounded hover:bg-secondary transition-colors"
              >
                {properties.status ? (
                  <span className="flex items-center gap-1.5">
                    <Circle
                      className={`h-2 w-2 fill-current ${STATUS_DOT[properties.status] ?? ""}`}
                    />
                    {properties.status}
                  </span>
                ) : (
                  <span className="text-muted-foreground/40">Empty</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[150px]">
              {STATUS_OPTIONS.map((option) => (
                <DropdownMenuItem key={option} onClick={() => setStatus(option)}>
                  <Circle className={`h-2 w-2 fill-current ${STATUS_DOT[option]}`} />
                  {option}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => setStatus(null)}
                className="text-muted-foreground"
              >
                Clear
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-xs">{properties.status ?? "—"}</span>
        )}
      </Row>

      <Row icon={CalendarDays} label="Date">
        {editable ? (
          <input
            type="date"
            value={properties.date ?? ""}
            onChange={(event) => setDate(event.target.value)}
            className="text-xs bg-transparent border-0 outline-none px-1.5 py-0.5 -ml-1.5 rounded hover:bg-secondary focus:bg-secondary transition-colors text-foreground"
          />
        ) : (
          <span className="text-xs">{properties.date ?? "—"}</span>
        )}
      </Row>

      <Row icon={Hash} label="Tags">
        <div className="flex flex-wrap items-center gap-1">
          {properties.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
            >
              {tag}
              {editable && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          ))}
          {editable && (
            <input
              value={draftTag}
              onChange={(event) => setDraftTag(event.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={addTag}
              placeholder={properties.tags.length === 0 ? "Empty" : "Add tag"}
              aria-label="Add tag"
              className="text-xs bg-transparent border-0 outline-none px-1.5 py-0.5 rounded w-24 hover:bg-secondary focus:bg-secondary transition-colors placeholder:text-muted-foreground/40"
            />
          )}
        </div>
      </Row>
    </div>
  );
}
