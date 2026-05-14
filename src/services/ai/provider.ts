import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import type { AppSettings } from "../../types/settings";

function env(name: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return value?.trim() ? value.trim() : undefined;
}

export function getActiveProvider(settings?: AppSettings | null): string {
  return settings?.ai_provider?.trim() || "ollama";
}

export function getActiveModel(settings?: AppSettings | null): string {
  return settings?.ai_model?.trim() || "gemma4:e2b";
}

export function createLanguageModel(
  settings?: AppSettings | null,
): LanguageModel | null {
  const provider = getActiveProvider(settings);
  const model = getActiveModel(settings);

  switch (provider) {
    case "vercel-openai": {
      const apiKey =
        settings?.openai_api_key?.trim() || env("VITE_OPENAI_API_KEY");
      return apiKey ? createOpenAI({ apiKey })(model) : null;
    }
    case "vercel-google": {
      const apiKey =
        settings?.google_api_key?.trim() || env("VITE_GOOGLE_API_KEY");
      return apiKey ? createGoogleGenerativeAI({ apiKey })(model) : null;
    }
    case "vercel-anthropic": {
      const apiKey =
        settings?.anthropic_api_key?.trim() || env("VITE_ANTHROPIC_API_KEY");
      return apiKey ? createAnthropic({ apiKey })(model) : null;
    }
    case "vercel-xai": {
      const apiKey = settings?.xai_api_key?.trim() || env("VITE_XAI_API_KEY");
      return apiKey ? createXai({ apiKey })(model) : null;
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
    return ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];
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
