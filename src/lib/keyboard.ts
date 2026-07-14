/** True when focus is in a text field — skip global shortcuts like ⌘N. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return !!target.closest("[contenteditable='true']");
}

/** True when the TipTap block editor has focus. */
export function isEditorFocused(): boolean {
  const editor = (window as { __nw_editor?: { isFocused: () => boolean } }).__nw_editor;
  return !!editor?.isFocused?.();
}
