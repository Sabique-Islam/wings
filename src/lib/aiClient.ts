// Compatibility shim — the AI client now lives under src/lib/ai/ with a
// modular provider architecture. This file re-exports the most-used helpers
// so older callers (InlineAIMenu, etc.) keep working untouched.

export { streamChat as streamGemini, generateOnce, generateImage } from "./ai/client";
export type { ChatMessage, ImageAttachment } from "./ai/types";
export {
  getActiveApiKey as getApiKey,
  getActiveModel as getModel,
  getActiveProvider,
  setActiveProvider,
  getApiKeyFor, setApiKeyFor, clearApiKeyFor,
  getModelFor, setModelFor,
} from "./ai/storage";
export { PROVIDERS, getProvider } from "./ai/providers";

// Back-compat — the old single-key setter/clearer wrote to legacy storage.
import { setApiKeyFor as _setKey, clearApiKeyFor as _clearKey, getActiveProvider as _active } from "./ai/storage";
export function setApiKey(key: string) { _setKey(_active(), key); }
export function clearApiKey() { _clearKey(_active()); }

// Old constant some screens referenced.
import { PROVIDERS as _all } from "./ai/providers";
export const GEMINI_MODELS = _all.find((p) => p.id === "google")?.models.map((m) => ({
  id: m.id, label: m.label, desc: "",
})) ?? [];
