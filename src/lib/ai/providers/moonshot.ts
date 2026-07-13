import { AIProvider } from "../types";
import { streamOpenAICompat } from "../openaiCompat";

// Moonshot / Kimi — OpenAI-compatible API.
export const moonshot: AIProvider = {
  id: "moonshot",
  label: "Kimi (Moonshot)",
  keyHelpUrl: "https://platform.moonshot.ai/console/api-keys",
  keyPlaceholder: "sk-…",
  models: [
    { id: "kimi-k2-0905-preview", label: "Kimi K2 (preview)" },
    { id: "moonshot-v1-128k", label: "Moonshot v1 128k" },
    { id: "moonshot-v1-32k", label: "Moonshot v1 32k" },
    { id: "moonshot-v1-8k", label: "Moonshot v1 8k" },
  ],
  stream({ messages, systemInstruction, model, signal, images }, apiKey) {
    return streamOpenAICompat({
      baseUrl: "https://api.moonshot.ai/v1",
      apiKey, model, messages, systemInstruction, signal, images,
    });
  },
};
