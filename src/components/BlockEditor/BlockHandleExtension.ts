import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

// ─────────────────────────────────────────────────────────────────────────────
// BlockHandle — Notion-style gutter affordance.
//
// Renders two floating buttons (⋮⋮ drag/menu, + add-below) in the left margin
// tracking the top-level block currently under the mouse. Fully implemented in
// ProseMirror-land so hover state doesn't trigger React re-renders.
//
// The DOM is a single detached container reused across hovers — creating and
// destroying nodes on every mousemove would be jank on long documents.
// ─────────────────────────────────────────────────────────────────────────────

const key = new PluginKey("blockHandle");

interface HandleState {
  container: HTMLDivElement;
  addBtn: HTMLButtonElement;
  dragBtn: HTMLButtonElement;
  target: HTMLElement | null;
  targetPos: number | null;
}

function findTopLevelBlockAt(view: EditorView, clientX: number, clientY: number) {
  const posInfo = view.posAtCoords({ left: clientX, top: clientY });
  if (!posInfo) return null;

  const $pos = view.state.doc.resolve(posInfo.pos);
  // Ascend to the direct child of doc.
  let depth = $pos.depth;
  while (depth > 0 && $pos.node(depth - 1).type.name !== "doc") depth--;
  if (depth < 1) return null;

  const pos = $pos.before(depth);
  const node = $pos.node(depth);
  const dom = view.nodeDOM(pos) as HTMLElement | null;
  if (!dom || dom.nodeType !== 1) return null;
  return { pos, node, dom };
}

function createHandleDom(): HandleState {
  const container = document.createElement("div");
  container.className = "nw-block-handle";
  container.setAttribute("contenteditable", "false");
  container.style.display = "none";

  const dragBtn = document.createElement("button");
  dragBtn.type = "button";
  dragBtn.className = "nw-block-handle-btn nw-block-handle-drag";
  dragBtn.setAttribute("aria-label", "Drag or open block menu");
  dragBtn.setAttribute("title", "Drag to move · click for menu");
  dragBtn.innerHTML = "⋮⋮";
  dragBtn.draggable = true;

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "nw-block-handle-btn nw-block-handle-add";
  addBtn.setAttribute("aria-label", "Insert block below");
  addBtn.setAttribute("title", "Insert block below (opens slash menu)");
  addBtn.innerHTML = "+";

  container.appendChild(addBtn);
  container.appendChild(dragBtn);

  return { container, addBtn, dragBtn, target: null, targetPos: null };
}

function positionHandle(state: HandleState, editorRoot: HTMLElement) {
  if (!state.target) {
    state.container.style.display = "none";
    return;
  }
  const targetRect = state.target.getBoundingClientRect();
  const rootRect = editorRoot.getBoundingClientRect();
  state.container.style.display = "flex";
  state.container.style.top = `${targetRect.top - rootRect.top + 2}px`;
  state.container.style.left = `${targetRect.left - rootRect.left - 44}px`;
}

export const BlockHandle = Extension.create({
  name: "blockHandle",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key,
        view(view) {
          const editorRoot = view.dom.parentElement as HTMLElement | null;
          if (!editorRoot) return { destroy: () => {} };

          // Ensure the wrapper can position absolute children.
          const priorPosition = editorRoot.style.position;
          if (!priorPosition) editorRoot.style.position = "relative";

          const state = createHandleDom();
          editorRoot.appendChild(state.container);

          const onMouseMove = (e: MouseEvent) => {
            if (!view.editable) return;
            const hit = findTopLevelBlockAt(view, e.clientX, e.clientY);
            if (!hit) return;
            if (state.target === hit.dom) return;
            state.target = hit.dom;
            state.targetPos = hit.pos;
            positionHandle(state, editorRoot);
          };

          const onMouseLeave = (e: MouseEvent) => {
            // Ignore leaves into our own handle.
            const to = e.relatedTarget as Node | null;
            if (to && state.container.contains(to)) return;
            state.target = null;
            state.targetPos = null;
            state.container.style.display = "none";
          };

          const onScroll = () => {
            if (state.target) positionHandle(state, editorRoot);
          };

          const openSlashAfter = () => {
            if (state.targetPos == null || !state.target) return;
            const node = view.state.doc.nodeAt(state.targetPos);
            if (!node) return;
            const insertPos = state.targetPos + node.nodeSize;
            const tr = view.state.tr.insert(
              insertPos,
              view.state.schema.nodes.paragraph.create(),
            );
            const sel = TextSelection.near(tr.doc.resolve(insertPos + 1));
            tr.setSelection(sel).scrollIntoView();
            view.dispatch(tr);
            view.focus();
            // Simulate a slash keypress so the SlashCommand suggestion opens.
            setTimeout(() => {
              const evt = new KeyboardEvent("keydown", { key: "/", bubbles: true });
              view.dom.dispatchEvent(evt);
              // Also actually insert the character since the synthetic
              // keydown alone doesn't produce input on all browsers.
              view.dispatch(view.state.tr.insertText("/"));
            }, 0);
          };

          const openBlockMenu = () => {
            if (state.targetPos == null) return;
            const detail = { pos: state.targetPos };
            window.dispatchEvent(new CustomEvent("nw:blockMenu", { detail }));
          };

          const onAddClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            openSlashAfter();
          };

          const onDragClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            openBlockMenu();
          };

          const onDragStart = (e: DragEvent) => {
            if (state.targetPos == null || !state.target) return;
            const node = view.state.doc.nodeAt(state.targetPos);
            if (!node) return;
            const slice = view.state.doc.slice(
              state.targetPos,
              state.targetPos + node.nodeSize,
            );
            (view as any).dragging = { slice, move: true };
            e.dataTransfer?.setData("text/html", state.target.outerHTML);
            e.dataTransfer?.setDragImage(state.target, 0, 0);
            if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
          };

          state.addBtn.addEventListener("mousedown", onAddClick);
          state.dragBtn.addEventListener("click", onDragClick);
          state.dragBtn.addEventListener("dragstart", onDragStart);
          view.dom.addEventListener("mousemove", onMouseMove);
          editorRoot.addEventListener("mouseleave", onMouseLeave);
          window.addEventListener("scroll", onScroll, true);

          return {
            destroy: () => {
              view.dom.removeEventListener("mousemove", onMouseMove);
              editorRoot.removeEventListener("mouseleave", onMouseLeave);
              window.removeEventListener("scroll", onScroll, true);
              state.container.remove();
              if (!priorPosition) editorRoot.style.position = "";
            },
          };
        },
      }),
    ];
  },
});
