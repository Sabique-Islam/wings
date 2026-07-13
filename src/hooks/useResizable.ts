import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  storageKey: string;
  defaultWidth: number;
  min: number;
  max: number;
  /** "left" = drag handle on right edge expands rightward (left sidebar).
   *  "right" = drag handle on left edge expands leftward (right sidebar). */
  side: "left" | "right";
}

export function useResizable({ storageKey, defaultWidth, min, max, side }: Options) {
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return defaultWidth;
    const stored = localStorage.getItem(storageKey);
    const n = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : defaultWidth;
  });
  const draggingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem(storageKey, String(width));
  }, [width, storageKey]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    const startX = e.clientX;
    const startW = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startX;
      const next = side === "left" ? startW + dx : startW - dx;
      setWidth(Math.min(max, Math.max(min, next)));
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width, min, max, side]);

  return { width, setWidth, onMouseDown };
}
