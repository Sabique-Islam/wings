import { useCallback, useEffect, useRef, type RefObject } from "react";

export interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface Options {
  enabled: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewportRef: React.MutableRefObject<Viewport>;
  onViewportChange?: (viewport: Viewport) => void;
}

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;

/** Pan (drag) and zoom (wheel) for the graph canvas. */
export function useGraphViewport({ enabled, canvasRef, viewportRef, onViewportChange }: Options) {
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const notify = useCallback(() => {
    onViewportChange?.({ ...viewportRef.current });
  }, [onViewportChange, viewportRef]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const { scale, offsetX, offsetY } = viewportRef.current;
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
      const ratio = nextScale / scale;
      viewportRef.current = {
        scale: nextScale,
        offsetX: px - (px - offsetX) * ratio,
        offsetY: py - (py - offsetY) * ratio,
      };
      notify();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      viewportRef.current = {
        ...viewportRef.current,
        offsetX: viewportRef.current.offsetX + dx,
        offsetY: viewportRef.current.offsetY + dy,
      };
      notify();
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      canvas.releasePointerCapture(e.pointerId);
      notify();
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
    };
  }, [enabled, canvasRef, viewportRef, notify]);
}

export function fitViewport(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  width: number,
  height: number,
  padding = 48,
): Viewport {
  const scale = Math.min(
    (width - padding * 2) / Math.max(1, maxX - minX),
    (height - padding * 2) / Math.max(1, maxY - minY),
    2.5,
  );
  return {
    scale,
    offsetX: width / 2 - ((minX + maxX) / 2) * scale,
    offsetY: height / 2 - ((minY + maxY) / 2) * scale,
  };
}
