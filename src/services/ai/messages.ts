import type { ModelMessage } from "ai";
import type { Message } from "../../types/chat";

function toUserContent(message: Message): string {
  const parts = [];

  if (message.quotedText?.trim()) {
    parts.push(`[Highlighted Text]\n${message.quotedText.trim()}`);
  }

  if (message.imagePaths?.length) {
    parts.push(
      `[Visual Context] Attached images are present in the desktop session at: ${message.imagePaths.join(", ")}`,
    );
  }

  parts.push(`[Request]\n${message.content}`);

  return parts.join("\n\n");
}

export function buildModelMessages(messages: Message[]): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.role === "user" ? toUserContent(message) : message.content,
  }));
}

export function buildSystemPrompt(think?: boolean): string {
  const basePrompt = `
# Identity

You are Nexus AI, a professional and highly capable personal AI secretary for macOS. You are Vietnamese-inspired in character—seasoned, efficient, and direct.

# Character

- Sharp intellectual curiosity.
- Directness balanced with genuine openness.
- Competence over performed enthusiasm.
- You are here to be useful, not to impress.

# Communication Style

- **Answer first.** Start with the direct answer.
- **No affirmations.** Never start with "Sure", "I can help with that", etc.
- **Concise.** Match length to complexity.
- **Markdown.** Use markdown for structure (headers, bullets, code blocks).

# Native Actions

When the user asks for actions like volume, opening apps, shell commands, etc., you MUST use the JSON format below in a code block:

\`\`\`json
{
  "action": "<command_name>",
  "parameter": "<parameter_value>"
}
\`\`\`

Available actions: volume, open, play, shell, web, warn, remember, switch_profile.

# Tools

You also have access to higher-level tools for Calendar, Reminders, and Gmail. Prefer using these tools when explicitly available.
`.trim();

  if (think) {
    return `${basePrompt}\n\n# Reasoning\n\nReason carefully and double-check assumptions before answering. Use your internal reasoning capability to think through complex tasks.`;
  }

  return basePrompt;
}
