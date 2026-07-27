import { useEffect, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { supabase } from "@/integrations/supabase/client";
import { collabColor } from "./collabExtensions";

export interface CollabSession {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: { id: string; name: string; color: string };
}

export interface CollabState {
  session: CollabSession | null;
  /** True while a shared page is still building its session. */
  connecting: boolean;
}

/**
 * Connect Yjs when the entry is shared and the user can edit.
 * Returns no session in solo mode (no WebSocket, no CRDT overhead).
 */
export function useCollabProvider(
  entryId: string | null,
  enabled: boolean,
  userId: string,
  userEmail: string,
): CollabState {
  const [session, setSession] = useState<CollabSession | null>(null);
  const collabUrl = import.meta.env.VITE_COLLAB_URL as string | undefined;
  const canConnect = Boolean(enabled && entryId && userId && collabUrl);

  useEffect(() => {
    if (!canConnect) {
      setSession(null);
      return;
    }

    const ydoc = new Y.Doc();
    const name = userEmail.split("@")[0] || userEmail;
    const user = { id: userId, name, color: collabColor(userId) };

    const provider = new HocuspocusProvider({
      url: collabUrl as string,
      name: `entry:${entryId}`,
      document: ydoc,
      // Resolved lazily so the session exists on the first render: TipTap cannot
      // adopt collaboration extensions after the editor has been created, and
      // waiting on the auth call here would force a second editor instance.
      token: async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token ?? "";
      },
      onAuthenticationFailed: () => {
        provider.destroy();
      },
      onDisconnect: () => {
        window.dispatchEvent(new CustomEvent("nw:collab-flush"));
      },
    });

    setSession({ ydoc, provider, user });

    return () => {
      provider.destroy();
      setSession(null);
    };
  }, [canConnect, collabUrl, entryId, userId, userEmail]);

  return { session, connecting: canConnect && !session };
}
