import { AIProvider } from "../types";
import { streamOpenAICompat } from "../openaiCompat";

// MiniMax exposes an OpenAI-compatible endpoint at /v1/text/chatcompletion_v2,
// but they also support the standard /v1/chat/completions shape. We use that.
export const minimax: AIProvider = {
  id: "minimax",
  label: "MiniMax",
  keyHelpUrl: "https://www.minimax.io/platform/user-center/basic-information/interface-key",
  keyPlaceholder: "Bearer key",
  models: [
    { id: "MiniMax-M2", label: "MiniMax M2" },
    { id: "MiniMax-Text-01", label: "MiniMax Text 01" },
    { id: "abab6.5s-chat", label: "abab6.5s" },
  ],
  stream({ messages, systemInstruction, model, signal, images }, apiKey) {
    return streamOpenAICompat({
      baseUrl: "https://api.minimaxi.chat/v1",
      apiKey, model, messages, systemInstruction, signal, images,
    });
  },
};
