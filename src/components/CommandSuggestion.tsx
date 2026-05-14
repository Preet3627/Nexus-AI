/**
 * CommandSuggestion: slash command autocomplete popover.
 *
 * Renders above the ask bar when the user types a "/" prefix.
 * The parent (AskBarView) is responsible for computing `filteredCommands`
 * and managing `highlightedIndex`. This component is purely presentational.
 */

import type React from "react";
import type { Command } from "../config/commands";

/** Hoisted static screen-capture SVG icon. */
const SCREEN_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2"
      width="14"
      height="10"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M5 14h6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M8 12v2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const WEB_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M2.75 8h10.5M8 2.25c1.5 1.5 2.25 3.42 2.25 5.75S9.5 12.25 8 13.75M8 2.25C6.5 3.75 5.75 5.67 5.75 8S6.5 12.25 8 13.75"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const OPEN_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M6 3.25H3.75A1.5 1.5 0 0 0 2.25 4.75v7.5a1.5 1.5 0 0 0 1.5 1.5h8.5a1.5 1.5 0 0 0 1.5-1.5V10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.25 2.25h5.5v5.5M13.5 2.5 7.5 8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SHELL_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2.5 4.5 6 8 2.5 11.5M7.75 11.5h5.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const VOLUME_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M2.5 9.25H5L8.5 12V4L5 6.75H2.5v2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M11 5.75c.75.55 1.25 1.37 1.25 2.25s-.5 1.7-1.25 2.25"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const TOUCH_ID_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M8 2.25c2.55 0 4.75 2.07 4.75 4.75 0 2.9-1.5 5.25-4.75 6.75-3.25-1.5-4.75-3.85-4.75-6.75 0-2.68 2.2-4.75 4.75-4.75Z"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 6.75c.25-.8.82-1.25 1.5-1.25.87 0 1.5.7 1.5 1.75v2.25"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
    />
    <path
      d="M5.5 8.5c0-1.85 1.02-3 2.5-3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

/** Returns the icon for a given command trigger. */
function iconForTrigger(trigger: string): React.ReactNode {
  switch (trigger) {
    case "/screen":
      return SCREEN_ICON;
    case "/web":
      return WEB_ICON;
    case "/open":
    case "/menuicon":
      return OPEN_ICON;
    case "/shell":
      return SHELL_ICON;
    case "/volume":
      return VOLUME_ICON;
    case "/touchid":
      return TOUCH_ID_ICON;
    case "/think":
    default:
      return SCREEN_ICON;
  }
}

interface CommandSuggestionProps {
  /** Filtered list of matching commands to display (computed by parent). */
  commands: readonly Command[];
  /** Index of the currently highlighted row (-1 means nothing highlighted). */
  highlightedIndex: number;
  /** Called with the trigger string when a row is clicked. */
  onSelect: (trigger: string) => void;
}

/**
 * Renders the slash command suggestion popover.
 *
 * When `commands` is empty, shows a "No commands found" placeholder row.
 * Otherwise renders one row per command with an icon, label, description,
 * and a Tab badge on the highlighted row.
 */
export function CommandSuggestion({
  commands,
  highlightedIndex,
  onSelect,
}: CommandSuggestionProps) {
  return (
    <div
      className="mx-3 mb-1 rounded-2xl border border-surface-border bg-surface-elevated backdrop-blur-3xl shadow-bar overflow-hidden"
      role="listbox"
      aria-label="Command suggestions"
    >
      {/* Header */}
      <div className="px-3 pt-2 pb-1">
        <span className="text-[10px] font-semibold tracking-widest text-text-secondary uppercase">
          Commands
        </span>
      </div>

      {commands.length === 0 ? (
        <div className="px-3 pb-2 text-sm text-text-secondary italic">
          No commands found
        </div>
      ) : (
        <ul className="pb-1" role="presentation">
          {commands.map((cmd, index) => {
            const isHighlighted = index === highlightedIndex;
            return (
              <li
                key={cmd.trigger}
                role="option"
                aria-selected={isHighlighted}
                className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer select-none transition-colors duration-100 ${
                  isHighlighted
                    ? "bg-white/10 text-text-primary"
                    : "text-text-secondary hover:bg-white/6 hover:text-text-primary"
                }`}
                onMouseDown={(e) => {
                  // Use mousedown + preventDefault so the textarea doesn't lose
                  // focus before the click is registered.
                  e.preventDefault();
                  onSelect(cmd.trigger);
                }}
              >
                {/* Icon */}
                <span
                  className={`shrink-0 ${isHighlighted ? "text-primary" : ""}`}
                >
                  {iconForTrigger(cmd.trigger)}
                </span>

                {/* Trigger label */}
                <span className="text-sm font-medium text-text-primary shrink-0">
                  {cmd.label}
                </span>

                {/* Description */}
                <span className="text-xs text-text-secondary min-w-0 truncate flex-1">
                  {cmd.description}
                </span>

                {/* Tab badge on highlighted row only */}
                {isHighlighted && (
                  <span className="shrink-0 text-[10px] font-medium text-text-secondary border border-surface-border rounded px-1 py-0.5 leading-none">
                    Tab
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
