import { createOpenAI } from "@ai-sdk/openai";
import type { AppSettings, McpHttpServerConfig } from "../../types/settings";

function sanitizeToolName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeMcpHeaders(
  server: McpHttpServerConfig,
  settings?: AppSettings | null,
): Record<string, string> | undefined {
  const headers = { ...(server.headers ?? {}) };

  if (
    server.id.toLowerCase().includes("exa") &&
    settings?.exa_api_key?.trim() &&
    !headers["x-api-key"]
  ) {
    headers["x-api-key"] = settings.exa_api_key.trim();
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
}

export function createProviderTools(settings?: AppSettings | null) {
  if (settings?.ai_provider !== "vercel-openai") {
    return {};
  }

  const apiKey = settings?.openai_api_key?.trim();
  if (!apiKey) {
    return {};
  }

  const openai = createOpenAI({ apiKey });
  const tools: Record<string, unknown> = {
    liveWebSearch: openai.tools.webSearch({
      externalWebAccess: true,
      searchContextSize: "medium",
      userLocation: {
        type: "approximate",
        timezone: "Asia/Kolkata",
      },
    }),
  };

  for (const server of settings.mcp_http_servers ?? []) {
    if (
      !server.enabled ||
      !server.server_url?.trim() ||
      !server.label?.trim()
    ) {
      continue;
    }

    const toolName = sanitizeToolName(`mcp_${server.id || server.label}`);
    if (!toolName) {
      continue;
    }

    tools[toolName] = openai.tools.mcp({
      serverLabel: server.label.trim(),
      serverDescription: server.server_description?.trim() || undefined,
      serverUrl: server.server_url.trim(),
      authorization: server.authorization?.trim() || undefined,
      headers: normalizeMcpHeaders(server, settings),
      allowedTools: { readOnly: true },
    });
  }

  return tools;
}
