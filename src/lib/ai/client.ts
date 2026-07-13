// Public entry point used by AIAssistant and InlineAIMenu. Dispatches to the
// active provider so callers don't have to know about provider internals.

import { ChatMessage, ImageAttachment } from "./types";
import { getProvider } from "./providers";
import {
  getActiveApiKey, getActiveModel, getActiveProvider,
} from "./storage";

export type { ChatMessage, ImageAttachment };

export async function* streamChat(opts: {
  messages: ChatMessage[];
  systemInstruction?: string;
  signal?: AbortSignal;
  images?: ImageAttachment[];
}): AsyncGenerator<string, void, unknown> {
  const providerId = getActiveProvider();
  const provider = getProvider(providerId);
  const apiKey = getActiveApiKey();
  const model = getActiveModel();
  if (!provider) throw new Error(`Unknown AI provider: ${providerId}`);
  if (!apiKey) throw new Error(`Missing API key for ${provider.label}. Add it in AI settings.`);
  yield* provider.stream(
    { messages: opts.messages, systemInstruction: opts.systemInstruction, model, signal: opts.signal, images: opts.images },
    apiKey,
  );
}

export async function generateOnce(opts: {
  prompt: string; systemInstruction?: string; signal?: AbortSignal; images?: ImageAttachment[];
}): Promise<string> {
  let out = "";
  for await (const chunk of streamChat({
    messages: [{ role: "user", content: opts.prompt }],
    systemInstruction: opts.systemInstruction,
    signal: opts.signal,
    images: opts.images,
  })) out += chunk;
  return out;
}

/** Generate an image with the active provider (if it supports image gen).
 *  Falls back to whichever provider has a key configured AND supports it. */
export async function generateImage(prompt: string, signal?: AbortSignal): Promise<{ base64: string; mimeType: string }> {
  const providerId = getActiveProvider();
  let provider = getProvider(providerId);
  let key = getActiveApiKey();
  if (!provider?.generateImage || !key) {
    // pick the first provider with a key + image gen capability
    const { PROVIDERS } = await import("./providers");
    const { getApiKeyFor } = await import("./storage");
    const fallback = PROVIDERS.find((p) => !!p.generateImage && !!getApiKeyFor(p.id));
    if (!fallback) throw new Error("No configured provider supports image generation. Add an OpenAI or Gemini key.");
    provider = fallback;
    key = (await import("./storage")).getApiKeyFor(fallback.id);
  }
  const b64 = await provider!.generateImage!(prompt, key, signal);
  return { base64: b64, mimeType: "image/png" };
}
