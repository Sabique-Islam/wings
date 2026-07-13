import { AIProvider } from "../types";
import { google } from "./google";
import { openai } from "./openai";
import { anthropic } from "./anthropic";
import { groq } from "./groq";
import { xai } from "./xai";
import { moonshot } from "./moonshot";
import { minimax } from "./minimax";

export const PROVIDERS: AIProvider[] = [google, openai, anthropic, groq, xai, moonshot, minimax];

export function getProvider(id: string): AIProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
