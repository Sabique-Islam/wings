import type { Extensions } from "@tiptap/core";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import type * as Y from "yjs";

export interface CollabUser {
  id: string;
  name: string;
  color: string;
}

/** TipTap extensions active only during a shared realtime session. */
export function createCollabExtensions(
  ydoc: Y.Doc,
  provider: HocuspocusProvider,
  user: CollabUser,
): Extensions {
  return [
    Collaboration.configure({ document: ydoc }),
    CollaborationCaret.configure({
      provider,
      user: { name: user.name, color: user.color },
    }),
  ];
}

/** Deterministic caret color from user id. */
export function collabColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}
