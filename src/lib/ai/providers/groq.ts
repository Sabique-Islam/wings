import { AIProvider } from "../types";
import { streamOpenAICompat } from "../openaiCompat";

export const groq: AIProvider = {
  id: "groq",
  label: "Groq",
  keyHelpUrl: "https://console.groq.com/keys",
  keyPlaceholder: "gsk_…",
  models: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fast)" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 Distill 70B" },
    { id: "qwen-2.5-32b", label: "Qwen 2.5 32B" },
  ],
  stream({ messages, systemInstruction, model, signal, images }, apiKey) {
    return streamOpenAICompat({
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey, model, messages, systemInstruction, signal, images,
    });
  },
};
