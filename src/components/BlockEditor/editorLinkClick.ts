/**
 * Decide what a click/auxclick on an editor link should do, and open safe
 * external http(s) targets. Bare hosts like `stenoai.co` are treated as https.
 */

export type EditorLinkAction =
  | { type: "navigatePage"; pageId: string }
  | { type: "openExternal"; href: string }
  | { type: "ignore" };

/** Turn a link href into an absolute http(s) URL, or null if unsafe / unusable. */
export function normalizeExternalHref(raw: string | null | undefined): string | null {
  const href = raw?.trim() ?? "";
  if (!href) return null;
  if (href.startsWith("#")) return null;
  const lower = href.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }

  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch {
      return null;
    }
    return null;
  }

  if (href.startsWith("//")) {
    try {
      return new URL(`https:${href}`).href;
    } catch {
      return null;
    }
  }

  // Bare host / path like stenoai.co or wavey.nopejs.me/foo — not a same-origin path.
  if (
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([/:?#].*)?$/i.test(href)
  ) {
    try {
      return new URL(`https://${href}`).href;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Primary click and middle-click open safe external URLs (editable + read-only).
 * Internal `#page:` links always navigate in-app.
 */
export function resolveEditorLinkAction(opts: {
  href: string | null | undefined;
  editable: boolean;
  /** Kept for callers; plain click opens external links too. */
  modKey: boolean;
  /** Middle mouse button */
  middleClick: boolean;
}): EditorLinkAction {
  void opts.editable;
  void opts.modKey;
  void opts.middleClick;

  const href = opts.href?.trim() ?? "";
  if (!href) return { type: "ignore" };

  if (href.startsWith("#page:")) {
    return { type: "navigatePage", pageId: href.replace("#page:", "") };
  }

  const external = normalizeExternalHref(href);
  if (!external) return { type: "ignore" };

  return { type: "openExternal", href: external };
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
