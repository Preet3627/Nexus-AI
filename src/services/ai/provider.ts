import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { createGroq } from "@ai-sdk/groq";
import type { AppSettings } from "../../types/settings";

function env(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value?.trim() ? value.trim() : undefined;
}

export function getActiveProvider(settings?: AppSettings | null): string {
  return settings?.ai_provider?.trim() || "ollama";
}

export function getActiveModel(settings?: AppSettings | null): string {
  const providedModel = settings?.ai_model?.trim();
  if (providedModel) return providedModel;

  const providerId = getActiveProvider(settings);
  if (providerId === "openai") return "gpt-5-mini";
  if (providerId === "google") return "gemini-1.5-flash";
  if (providerId === "anthropic") return "claude-3-7-sonnet-latest";
  if (providerId === "xai") return "grok-3-mini";
  if (providerId === "groq") return "deepseek-r1-distill-llama-70b";
  return "";
}

export function createLanguageModel(
  settings?: AppSettings | null,
): LanguageModel | null {
  const provider = getActiveProvider(settings);
  const model = getActiveModel(settings);

  switch (provider) {
    case "openai": {
      const apiKey =
        settings?.openai_api_key?.trim() || env("VITE_OPENAI_API_KEY");
      return apiKey ? createOpenAI({ apiKey })(model) : null;
    }
    case "google": {
      const apiKey =
        settings?.google_api_key?.trim() || env("VITE_GOOGLE_API_KEY");
      return apiKey ? createGoogleGenerativeAI({ apiKey })(model) : null;
    }
    case "anthropic": {
      const apiKey =
        settings?.anthropic_api_key?.trim() || env("VITE_ANTHROPIC_API_KEY");
      return apiKey ? createAnthropic({ apiKey })(model) : null;
    }
    case "xai": {
      const apiKey = settings?.xai_api_key?.trim() || env("VITE_XAI_API_KEY");
      return apiKey ? createXai({ apiKey })(model) : null;
    }
    case "groq": {
      const apiKey = settings?.groq_api_key?.trim() || env("VITE_GROQ_API_KEY");
      return apiKey ? createGroq({ apiKey })(model) : null;
    }
    default:
      return null;
  }
}

interface OpenAIModelsResponse {
  data: Array<{ id: string; object: string }>;
}

interface GoogleModelsResponse {
  models: Array<{ name: string }>;
}

interface AnthropicModelsResponse {
  data: Array<{ name: string }>;
}

interface XaiModelsResponse {
  data: Array<{ name: string }>;
}

interface GroqModelsResponse {
  data: Array<{ id: string }>;
}

export async function fetchOpenAIModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data: OpenAIModelsResponse = await response.json();
    return data.data
      .filter((m) => m.id.startsWith("gpt-") || m.id.startsWith("o"))
      .map((m) => m.id)
      .sort();
  } catch {
    return ["gpt-5-mini", "gpt-4o", "gpt-4o-mini", "o1-mini"];
  }
}

export async function fetchGoogleModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey,
    );
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data: GoogleModelsResponse = await response.json();
    return data.models.map((m) => m.name.replace("models/", "")).sort();
  } catch {
    return [
      "gemini-1.5-pro",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
      "gemini-3.0-flash"
    ];
  }
}

export async function fetchAnthropicModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data: AnthropicModelsResponse = await response.json();
    return data.data.map((m) => m.name).sort();
  } catch {
    return [
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-opus-latest",
    ];
  }
}

export async function fetchXaiModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.x.ai/v1/models", {
      headers: {
        Authorization: "Bearer " + apiKey,
      },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data: XaiModelsResponse = await response.json();
    return data.data.map((m) => m.name).sort();
  } catch {
    return ["grok-3-mini", "grok-3", "grok-2"];
  }
}

export async function fetchGroqModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: "Bearer " + apiKey,
      },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data: GroqModelsResponse = await response.json();
    return data.data.map((m) => m.id).sort();
  } catch {
    return ["deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"];
  }
}
