import { COMMANDS } from "../config/commands";

export function parseCommands(text: string): {
  found: Set<string>;
  strippedMessage: string;
} {
  const words = text.trim().split(/\s+/);
  const triggerSet = new Set(COMMANDS.map((command) => command.trigger));
  const found = new Set<string>();
  const remaining: string[] = [];

  for (const word of words) {
    if (triggerSet.has(word)) {
      found.add(word);
    } else {
      remaining.push(word);
    }
  }

  return {
    found,
    strippedMessage: remaining.join(" "),
  };
}
