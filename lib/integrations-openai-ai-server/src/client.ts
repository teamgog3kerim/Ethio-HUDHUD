import OpenAI from "openai";

// Replit provisions its own proxy credentials. For deployments outside Replit,
// use a provider-owned OpenAI key and optionally an OpenAI-compatible base URL.
const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL ?? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
if (!apiKey) throw new Error("OPENAI_API_KEY (or the Replit AI integration credentials) must be configured.");

export const openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
