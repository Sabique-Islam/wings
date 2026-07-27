import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Share2, X } from "lucide-react";
import { getEntryTitle, type Entry } from "@/lib/journal";
import { getLinkEdges } from "@/lib/linkIndex";
import {
  buildGraph,
  graphBounds,
  nodeRadius,
  stepLayout,
  type Graph,
  type GraphNode,
} from "@/lib/graphLayout";

/** Enough ticks for the layout to settle, after which the loop stops. */
const SETTLE_TICKS = 420;
const PADDING = 48;

interface Props {
  entries: Entry[];
  activeId: string | null;
  onNavigate: (id: string) => void;
}

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

function fitViewport(graph: Graph, width: number, height: number): Viewport {
  const { minX, minY, maxX, maxY } = graphBounds(graph.nodes);
  const scale = Math.min(
    (width - PADDING * 2) / Math.max(1, maxX - minX),
    (height - PADDING * 2) / Math.max(1, maxY - minY),
    2.5,
  );
  return {
    scale,
    offsetX: width / 2 - ((minX + maxX) / 2) * scale,
    offsetY: height / 2 - ((minY + maxY) / 2) * scale,
  };
}

/**
 * Whole-workspace link graph, drawn from the local index and page hierarchy.
 * Canvas rather than SVG so a settling simulation never touches the DOM.
 */
export function GraphView({ entries, activeId, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport>({ scale: 1, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("nw:graph", toggle);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("nw:graph", toggle);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  // Rebuilt when the modal opens so the graph reflects the current index without
  // recomputing while it is closed.
  const graph = useMemo(() => {
    if (!open) return null;
    const known = new Set(entries.map((e) => e.id));
    return buildGraph(
      entries.map((e) => ({ id: e.id, label: getEntryTitle(e), parentId: e.parent_id })),
      getLinkEdges(known),
    );
  }, [open, entries]);

  const nodeAt = useCallback(
    (clientX: number, clientY: number): GraphNode | null => {
      const canvas = canvasRef.current;
      if (!canvas || !graph) return null;
      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = viewportRef.current;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      for (const node of graph.nodes) {
        const dx = x - (node.x * scale + offsetX);
        const dy = y - (node.y * scale + offsetY);
        if (Math.hypot(dx, dy) <= nodeRadius(node) + 6) return node;
      }
      return null;
    },
    [graph],
  );

  useEffect(() => {
    if (!open || !graph) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    const styles = getComputedStyle(document.documentElement);
    const foreground = `hsl(${styles.getPropertyValue("--foreground").trim()})`;
    const muted = `hsl(${styles.getPropertyValue("--muted-foreground").trim()})`;
    const accent = `hsl(${styles.getPropertyValue("--primary").trim() || styles.getPropertyValue("--foreground").trim()})`;

    let tick = 0;
    let frame = 0;

    const draw = () => {
      const { scale, offsetX, offsetY } = viewportRef.current;
      const project = (node: GraphNode) => ({
        x: node.x * scale + offsetX,
        y: node.y * scale + offsetY,
      });

      context.clearRect(0, 0, width, height);
      const byId = new Map(graph.nodes.map((n) => [n.id, n]));

      for (const edge of graph.edges) {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) continue;
        const a = project(from);
        const b = project(to);
        context.strokeStyle = muted;
        context.globalAlpha = edge.kind === "child" ? 0.18 : 0.3;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      context.globalAlpha = 1;
      for (const node of graph.nodes) {
        const { x, y } = project(node);
        const radius = nodeRadius(node);
        const isActive = node.id === activeId;
        context.fillStyle = isActive ? accent : foreground;
        context.globalAlpha = isActive ? 1 : 0.55;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();

        if (isActive || node.degree >= 2 || graph.nodes.length <= 40) {
          context.globalAlpha = isActive ? 0.9 : 0.5;
          context.fillStyle = foreground;
          context.font = "10px ui-sans-serif, system-ui, sans-serif";
          context.textAlign = "center";
          context.fillText(node.label.slice(0, 24), x, y + radius + 11);
        }
      }
      context.globalAlpha = 1;
    };

    const loop = () => {
      stepLayout(graph);
      // Refit while the layout is still expanding, then leave the view alone.
      if (tick % 12 === 0 || tick < 30) {
        viewportRef.current = fitViewport(graph, width, height);
      }
      draw();
      tick += 1;
      if (tick < SETTLE_TICKS) frame = requestAnimationFrame(loop);
    };

    viewportRef.current = fitViewport(graph, width, height);
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [open, graph, activeId]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-background/80" onClick={() => setOpen(false)} />
      <div className="relative bg-card border border-border rounded-lg shadow-2xl w-[min(90vw,960px)] h-[min(85vh,720px)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-xs text-foreground font-mono">
            <Share2 className="h-3.5 w-3.5" />
            <span>graph · {graph?.nodes.length ?? 0} pages · {graph?.edges.length ?? 0} links</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close graph"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex-1 relative min-h-0">
          <canvas
            ref={canvasRef}
            className={`w-full h-full ${hovered ? "cursor-pointer" : "cursor-default"}`}
            onMouseMove={(e) => setHovered(nodeAt(e.clientX, e.clientY))}
            onMouseLeave={() => setHovered(null)}
            onClick={(e) => {
              const node = nodeAt(e.clientX, e.clientY);
              if (!node) return;
              setOpen(false);
              onNavigate(node.id);
            }}
          />
          {hovered && (
            <div className="absolute bottom-3 left-3 text-[11px] text-muted-foreground bg-card/90 border border-border-subtle rounded px-2 py-1 pointer-events-none">
              {hovered.label} · {hovered.degree} connection{hovered.degree === 1 ? "" : "s"}
            </div>
          )}
          {graph?.nodes.length === 0 && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              No pages yet.
            </p>
          )}
        </div>
        <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground/40 font-mono shrink-0">
          ⌘⇧G to toggle · click a node to open
        </div>
      </div>
    </div>
  );
}
