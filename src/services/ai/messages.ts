import type { ModelMessage } from "ai";
import type { Message } from "../../types/chat";

function toUserContent(message: Message): string {
  const parts = [message.content];

  if (message.quotedText?.trim()) {
    parts.unshift(`Selected context:\n${message.quotedText.trim()}`);
  }

  if (message.imagePaths?.length) {
    parts.push(
      `Attached images are present in the desktop session at: ${message.imagePaths.join(", ")}`,
    );
  }

  return parts.join("\n\n");
}

export function buildModelMessages(messages: Message[]): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.role === "user" ? toUserContent(message) : message.content,
  }));
}

export function buildSystemPrompt(think?: boolean): string {
  return [
    "You are Nexus AI, a native macOS assistant.",
    "Prefer using tools when the user wants you to open apps, control Comet-AI, search the web, play music, inspect the calendar, create events, or create reminder alarms.",
    "Be concise, action-oriented, and mention what you actually did.",
    think
      ? "Reason carefully and double-check assumptions before answering."
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}
