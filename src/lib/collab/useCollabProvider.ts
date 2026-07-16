import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { supabase } from "@/integrations/supabase/client";
import { collabColor } from "./collabExtensions";

export interface CollabSession {
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  user: { id: string; name: string; color: string };
}

/**
 * Connect Yjs when the entry is shared and the user can edit.
 * Returns null in solo mode (no WebSocket, no CRDT overhead).
 */
export function useCollabProvider(
  entryId: string | null,
  enabled: boolean,
  userId: string,
  userEmail: string,
): CollabSession | null {
  const [session, setSession] = useState<CollabSession | null>(null);
  const sessionRef = useRef<CollabSession | null>(null);

  useEffect(() => {
    if (!enabled || !entryId || !userId) {
      sessionRef.current?.provider.destroy();
      sessionRef.current = null;
      setSession(null);
      return;
    }

    const collabUrl = import.meta.env.VITE_COLLAB_URL as string | undefined;
    if (!collabUrl) {
      setSession(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      if (!token || cancelled) return;

      const ydoc = new Y.Doc();
      const name = userEmail.split("@")[0] || userEmail;
      const user = { id: userId, name, color: collabColor(userId) };

      const provider = new HocuspocusProvider({
        url: collabUrl,
        name: `entry:${entryId}`,
        document: ydoc,
        token,
        onAuthenticationFailed: () => {
          provider.destroy();
        },
        onDisconnect: () => {
          window.dispatchEvent(new CustomEvent("nw:collab-flush"));
        },
      });

      const next: CollabSession = { ydoc, provider, user };
      sessionRef.current = next;
      if (!cancelled) setSession(next);
    })();

    return () => {
      cancelled = true;
      sessionRef.current?.provider.destroy();
      sessionRef.current = null;
      setSession(null);
    };
  }, [enabled, entryId, userId, userEmail]);

  return session;
}
