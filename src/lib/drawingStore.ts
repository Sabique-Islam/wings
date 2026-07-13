// Per-scene Excalidraw persistence (localStorage keyed by sceneId).
// Also supports a transient "draft" key (used by the canvas overlay autosave).

const SCENE_PREFIX = "nw:scene:";
const DRAFT_KEY = (entryId: string) => `nw:scene-draft:${entryId}`;

export function newSceneId(): string {
  return (crypto as any).randomUUID?.() || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function saveScene(sceneId: string, scene: any) {
  try {
    localStorage.setItem(SCENE_PREFIX + sceneId, JSON.stringify(scene));
  } catch (e) {
    console.warn("scene save failed", e);
  }
}

export function loadScene(sceneId: string): any | null {
  try {
    const raw = localStorage.getItem(SCENE_PREFIX + sceneId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function deleteScene(sceneId: string) {
  localStorage.removeItem(SCENE_PREFIX + sceneId);
}

export function saveDraft(entryId: string, scene: any) {
  try {
    localStorage.setItem(DRAFT_KEY(entryId), JSON.stringify(scene));
  } catch {}
}
export function loadDraft(entryId: string): any | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(entryId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function clearDraft(entryId: string) {
  localStorage.removeItem(DRAFT_KEY(entryId));
}
