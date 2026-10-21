import OpenAI from "openai";

let client: OpenAI | null = null;

/** Optional AI must not prevent courses or the HTTP server from starting. */
export function getTutorClient(): OpenAI | null {
  if (client) return client;
  const externalKey = process.env.OPENAI_API_KEY;
  const managedKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const managedBase = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (externalKey) {
    client = new OpenAI({ apiKey: externalKey, baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1" });
  } else if (managedKey && managedBase) {
    client = new OpenAI({ apiKey: managedKey, baseURL: managedBase });
  }
  return client;
}
