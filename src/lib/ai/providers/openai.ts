import { AIProvider } from "../types";
import { streamOpenAICompat } from "../openaiCompat";

export const openai: AIProvider = {
  id: "openai",
  label: "OpenAI",
  keyHelpUrl: "https://platform.openai.com/api-keys",
  keyPlaceholder: "sk-…",
  models: [
    { id: "gpt-5.5", label: "GPT-5.5 (most capable)", vision: true },
    { id: "gpt-5.4", label: "GPT-5.4", vision: true },
    { id: "gpt-5.4-mini", label: "GPT-5.4 mini", vision: true },
    { id: "gpt-5.4-nano", label: "GPT-5.4 nano" },
    { id: "gpt-5.2", label: "GPT-5.2", vision: true },
    { id: "gpt-5", label: "GPT-5", vision: true },
    { id: "gpt-5-mini", label: "GPT-5 mini", vision: true },
    { id: "gpt-5-nano", label: "GPT-5 nano" },
  ],
  stream({ messages, systemInstruction, model, signal, images }, apiKey) {
    return streamOpenAICompat({
      baseUrl: "https://api.openai.com/v1",
      apiKey, model, messages, systemInstruction, signal, images,
    });
  },
  async generateImage(prompt, apiKey, signal) {
    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
      signal,
    });
    if (!resp.ok) throw new Error(`Image gen failed (${resp.status}): ${(await resp.text()).slice(0, 200)}`);
    const json = await resp.json();
    const b64 = json?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");
    return b64;
  },
};
