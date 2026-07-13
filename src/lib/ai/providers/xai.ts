import { AIProvider } from "../types";
import { streamOpenAICompat } from "../openaiCompat";

export const xai: AIProvider = {
  id: "xai",
  label: "Grok (xAI)",
  keyHelpUrl: "https://console.x.ai/",
  keyPlaceholder: "xai-…",
  models: [
    { id: "grok-4-fast", label: "Grok 4 Fast", vision: true },
    { id: "grok-4", label: "Grok 4", vision: true },
    { id: "grok-4-heavy", label: "Grok 4 Heavy (reasoning)", vision: true },
    { id: "grok-3", label: "Grok 3" },
    { id: "grok-3-mini", label: "Grok 3 mini" },
  ],
  stream({ messages, systemInstruction, model, signal, images }, apiKey) {
    return streamOpenAICompat({
      baseUrl: "https://api.x.ai/v1",
      apiKey, model, messages, systemInstruction, signal, images,
    });
  },
};
