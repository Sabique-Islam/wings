import { isSafeHttpUrl } from "@/lib/safeUrl";

export type EditorLinkAction =
  | { type: "navigatePage"; pageId: string }
  | { type: "openExternal"; href: string }
  | { type: "ignore" };

/**
 * Decide what a click/auxclick on an editor link should do.
 * Editable: external URLs open only with mod-click or middle-click.
 * Read-only: any primary click opens safe external URLs.
 */
export function resolveEditorLinkAction(opts: {
  href: string | null | undefined;
  editable: boolean;
  /** Primary click with Cmd/Ctrl held */
  modKey: boolean;
  /** Middle mouse button */
  middleClick: boolean;
}): EditorLinkAction {
  const href = opts.href?.trim() ?? "";
  if (!href) return { type: "ignore" };

  if (href.startsWith("#page:")) {
    return { type: "navigatePage", pageId: href.replace("#page:", "") };
  }

  if (!isSafeHttpUrl(href)) return { type: "ignore" };

  if (!opts.editable) {
    return { type: "openExternal", href };
  }

  if (opts.modKey || opts.middleClick) {
    return { type: "openExternal", href };
  }

  return { type: "ignore" };
}

export function applyEditorLinkAction(action: EditorLinkAction): boolean {
  if (action.type === "navigatePage") {
    window.dispatchEvent(new CustomEvent("nw:navigate", { detail: action.pageId }));
    return true;
  }
  if (action.type === "openExternal") {
    window.open(action.href, "_blank", "noopener,noreferrer");
    return true;
  }
  return false;
}

/** Open the link mark at the current selection (Mod-Enter). */
export function openLinkHref(href: string | null | undefined): boolean {
  const action = resolveEditorLinkAction({
    href,
    editable: true,
    modKey: true,
    middleClick: false,
  });
  return applyEditorLinkAction(action);
}
