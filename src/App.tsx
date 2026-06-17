import { motion, AnimatePresence } from "framer-motion";
import type React from "react";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useOllama } from "./hooks/useOllama";
import { useAppSettings } from "./hooks/useAppSettings";
import type { Message } from "./types/chat";
import { useConversationHistory } from "./hooks/useConversationHistory";
import { ConversationView } from "./view/ConversationView";
import { AskBarView, MAX_IMAGES } from "./view/AskBarView";
import { OnboardingView } from "./view/onboarding/index";
import type { OnboardingStage } from "./view/onboarding/index";
import { HistoryPanel } from "./components/HistoryPanel";
import { ImagePreviewModal } from "./components/ImagePreviewModal";
import { SettingsPanel } from "./view/SettingsPanel";
import { HelpPanel } from "./view/HelpPanel";
import type { AttachedImage } from "./types/image";
import { quote } from "./config";
import { SCREEN_CAPTURE_PLACEHOLDER } from "./config/commands";
import { parseCommands } from "./utils/commandParser";
import type { AppSettingsPatch } from "./types/settings";
import "./App.css";

/** Fallback model name used before get_model_config resolves at startup. */
const DEFAULT_MODEL_FALLBACK = "llama3.2";

const OVERLAY_VISIBILITY_EVENT = "thuki://visibility";
const ONBOARDING_EVENT = "thuki://onboarding";
const THEME_CHANGE_EVENT = "theme-changed";
const SIRI_PENDING_EVENT = "nexus://siri-pending";
const NATIVE_ACTION_COMMANDS = [
  "/web",
  "/open",
  "/play",
  "/shell",
  "/volume",
  "/menuicon",
  "/touchid",
  "/provider",
  "/apikey",
  "/comet",
  "/shareauth",
  "/github",
  "/mcp",
  "/extract",
  "/signin",
  "/gmail",
  "/drive",
  "/calendar",
  "/alarm",
  "/autolaunch",
] as const;

type NativeActionCommand = (typeof NATIVE_ACTION_COMMANDS)[number];

interface InferredNativeAction {
  command: NativeActionCommand;
  strippedMessage: string;
}

function inferNativeAction(text: string): InferredNativeAction | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const openMatch = trimmed.match(
    /^(?:open|launch|start)\s+(?:up\s+)?(.+)$/i,
  );
  if (openMatch) {
    return {
      command: "/open",
      strippedMessage: openMatch[1].trim(),
    };
  }

  const webMatch = trimmed.match(
    /^(?:search\s+(?:the\s+)?web(?:\s+for)?|web\s+search|google)\s+(.+)$/i,
  );
  if (webMatch) {
    return {
      command: "/web",
      strippedMessage: webMatch[1].trim(),
    };
  }

  const playMatch = trimmed.match(/^play\s+(.+)$/i);
  if (playMatch) {
    return {
      command: "/play",
      strippedMessage: playMatch[1].trim(),
    };
  }

  const volumeMatch = trimmed.match(
    /^(?:set|change|turn)\s+(?:the\s+)?volume(?:\s+(?:to|down\s+to|up\s+to))?\s+(\d{1,3})\b/i,
  );
  if (volumeMatch) {
    return {
      command: "/volume",
      strippedMessage: volumeMatch[1].trim(),
    };
  }

  const providerMatch = trimmed.match(
    /^(?:switch|set|use)\s+(?:(?:the\s+)?(?:ai\s+)?(?:provider|model)\s+)?(?:to\s+)?(ollama|openai|google|anthropic|xai|groq)\b(.*)$/i,
  );
  if (providerMatch) {
    return {
      command: "/provider",
      strippedMessage: `${providerMatch[1].toLowerCase()} ${providerMatch[2].trim()}`.trim(),
    };
  }

  const signOutMatch = trimmed.match(
    /^(?:sign\s*out|log\s*out|disconnect)\s+(?:google|gmail|workspace)(.*)$/i,
  );
  if (signOutMatch) {
    return {
      command: "/signin",
      strippedMessage: "signout",
    };
  }

  const signInMatch = trimmed.match(
    /^(?:sign\s*in|log\s*in|connect)\s+(?:with\s+)?google(?:\s+(workspace|gmail|drive))?(.*)$/i,
  );
  if (signInMatch) {
    const scope = signInMatch[1]?.trim().toLowerCase();
    if (scope === "workspace" || scope === "gmail" || scope === "drive") {
      return {
        command: "/signin",
        strippedMessage: `workspace ${scope}`.trim(),
      };
    }
    return {
      command: "/signin",
      strippedMessage: "google",
    };
  }

  const shellMatch = trimmed.match(
    /^(?:run|execute)\s+(?:this\s+)?(?:shell\s+command|command)\s*:?\s+(.+)$/i,
  );
  if (shellMatch) {
    return {
      command: "/shell",
      strippedMessage: shellMatch[1].trim(),
    };
  }

  return null;
}

function normalizeThemeName(theme?: string | null): string {
  switch (theme?.trim().toLowerCase()) {
    case "light":
    case "graphite":
    case "aurora":
    case "dawn":
      return theme.trim().toLowerCase();
    default:
      return "dark";
  }
}

function applyThemeToDocument(theme?: string | null) {
  const normalizedTheme = normalizeThemeName(theme);
  document.documentElement.dataset.theme = normalizedTheme;
  document.documentElement.style.colorScheme =
    normalizedTheme === "light" || normalizedTheme === "dawn"
      ? "light"
      : "dark";
}

interface ShellCommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exit_code?: number | null;
  exitCode: number | null;
  succeeded: boolean;
}

interface TouchIDVerification {
  verified: boolean;
  biometry: string;
  message: string;
}

interface GoogleAuthStatus {
  identity_connected: boolean;
  workspace_connected: boolean;
  email?: string | null;
  workspace_scopes: string[];
}

interface GmailListItem {
  id: string;
  thread_id?: string | null;
  from?: string | null;
  to?: string | null;
  subject?: string | null;
  snippet?: string | null;
  date?: string | null;
}

interface GmailMessage {
  id: string;
  thread_id?: string | null;
  from?: string | null;
  to?: string | null;
  subject?: string | null;
  snippet?: string | null;
  date?: string | null;
  body_text?: string | null;
  body_html?: string | null;
}

interface DriveFileItem {
  id: string;
  name: string;
  mime_type?: string | null;
  modified_time?: string | null;
  owner?: string | null;
  web_view_link?: string | null;
}

interface GitHubRepositorySummary {
  full_name: string;
  description?: string | null;
  html_url: string;
  stargazers_count: number;
  language?: string | null;
  updated_at?: string | null;
}

interface GitHubIssueSummary {
  title: string;
  html_url: string;
  repository_url: string;
  state: string;
  number: number;
  updated_at?: string | null;
  is_pull_request: boolean;
}

interface GitHubPullRequestSummary {
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft?: boolean | null;
  updated_at?: string | null;
}

interface GitHubFileContentResult {
  repository: string;
  path: string;
  reference?: string | null;
  html_url?: string | null;
  download_url?: string | null;
  content: string;
  truncated: boolean;
}

interface ExtractedContent {
  path: string;
  file_name: string;
  file_type: string;
  extractor: string;
  text: string;
  truncated: boolean;
  metadata: Record<string, string>;
}

interface SiriBridgeRequest {
  id: string;
  message: string;
}

interface PlayCommandInput {
  query: string;
  provider?: string;
}

function slugifyMcpId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function firstNativeCommand(found: Set<string>): NativeActionCommand | null {
  return NATIVE_ACTION_COMMANDS.find((command) => found.has(command)) ?? null;
}

function parsePlayCommandInput(message: string): PlayCommandInput | null {
  const trimmed = message.trim();
  if (!trimmed.toLowerCase().startsWith("/play")) {
    return null;
  }

  const payload = trimmed.slice(5).trim();
  if (!payload) {
    return null;
  }

  const [queryPart, providerPart] = payload
    .split("|")
    .map((part) => part.trim());
  if (!queryPart) {
    return null;
  }

  return {
    query: queryPart,
    provider: providerPart || undefined,
  };
}

function formatShellResult(result: ShellCommandResult): string {
  const exitCode = result.exitCode ?? result.exit_code ?? null;
  const sections = [
    `Shell command finished with exit code ${exitCode ?? "unknown"}.`,
  ];

  if (result.stdout.trim()) {
    sections.push(`stdout:\n\`\`\`\n${result.stdout.trim()}\n\`\`\``);
  }

  if (result.stderr.trim()) {
    sections.push(`stderr:\n\`\`\`\n${result.stderr.trim()}\n\`\`\``);
  }

  if (!result.stdout.trim() && !result.stderr.trim()) {
    sections.push("The command completed without producing output.");
  }

  return sections.join("\n\n");
}

function formatGoogleAuthStatus(status: GoogleAuthStatus): string {
  const lines = [
    `Google identity: ${status.identity_connected ? "connected" : "not connected"}`,
    `Google Workspace: ${status.workspace_connected ? "connected" : "not connected"}`,
  ];

  if (status.email) {
    lines.push(`Account: ${status.email}`);
  }

  if (status.workspace_scopes.length > 0) {
    lines.push(`Scopes: ${status.workspace_scopes.join(", ")}`);
  }

  return lines.join("\n");
}

function formatGmailList(messages: GmailListItem[]): string {
  if (messages.length === 0) {
    return "No Gmail messages matched that request.";
  }

  return messages
    .map((message, index) => {
      const header = [
        `${index + 1}. ${message.subject || "(no subject)"}`,
        message.from ? `from ${message.from}` : null,
        message.date ? `on ${message.date}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      const lines = [header, `id: ${message.id}`];
      if (message.snippet) {
        lines.push(message.snippet);
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

function formatGmailMessage(message: GmailMessage): string {
  const lines = [
    `Subject: ${message.subject || "(no subject)"}`,
    message.from ? `From: ${message.from}` : null,
    message.to ? `To: ${message.to}` : null,
    message.date ? `Date: ${message.date}` : null,
    `Message ID: ${message.id}`,
    "",
    message.body_text?.trim() ||
      message.snippet?.trim() ||
      message.body_html?.trim() ||
      "This message has no readable body.",
  ];

  return lines.filter((line) => line !== null).join("\n");
}

function formatDriveFiles(files: DriveFileItem[]): string {
  if (files.length === 0) {
    return "No Google Drive files matched that request.";
  }

  return files
    .map((file, index) =>
      [
        `${index + 1}. ${file.name}`,
        `id: ${file.id}`,
        file.owner ? `owner: ${file.owner}` : null,
        file.mime_type ? `type: ${file.mime_type}` : null,
        file.modified_time ? `updated: ${file.modified_time}` : null,
        file.web_view_link ? `open: ${file.web_view_link}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatGitHubRepositories(items: GitHubRepositorySummary[]): string {
  if (items.length === 0) {
    return "No GitHub repositories matched that query.";
  }

  return items
    .map((item, index) =>
      [
        `${index + 1}. ${item.full_name}`,
        item.description || null,
        `stars: ${item.stargazers_count}`,
        item.language ? `language: ${item.language}` : null,
        item.updated_at ? `updated: ${item.updated_at}` : null,
        item.html_url,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatGitHubIssues(items: GitHubIssueSummary[]): string {
  if (items.length === 0) {
    return "No GitHub issues or pull requests matched that query.";
  }

  return items
    .map((item, index) =>
      [
        `${index + 1}. ${item.title}`,
        `${item.is_pull_request ? "pull request" : "issue"} #${item.number} (${item.state})`,
        item.updated_at ? `updated: ${item.updated_at}` : null,
        item.html_url,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatGitHubPullRequests(items: GitHubPullRequestSummary[]): string {
  if (items.length === 0) {
    return "No pull requests matched that repository request.";
  }

  return items
    .map((item) =>
      [
        `#${item.number} ${item.title}`,
        `state: ${item.state}${item.draft ? " draft" : ""}`,
        item.updated_at ? `updated: ${item.updated_at}` : null,
        item.html_url,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

function formatGitHubFile(item: GitHubFileContentResult): string {
  return [
    `${item.repository}:${item.path}`,
    item.reference ? `ref: ${item.reference}` : null,
    item.html_url || null,
    "",
    item.content,
    item.truncated ? "\n[content truncated]" : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatExtractedContent(item: ExtractedContent): string {
  const metadata = Object.entries(item.metadata ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");

  return [
    `${item.file_name} (${item.file_type})`,
    `extractor: ${item.extractor}`,
    metadata ? `metadata: ${metadata}` : null,
    "",
    item.text || "No readable text was extracted.",
    item.truncated ? "\n[extracted text truncated]" : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatMcpServers(
  settings:
    | {
        mcp_http_servers?: Array<{
          id: string;
          label: string;
          server_url: string;
          server_description?: string | null;
          enabled: boolean;
        }>;
      }
    | null
    | undefined,
): string {
  const servers = settings?.mcp_http_servers ?? [];
  if (servers.length === 0) {
    return "No MCP servers are configured.";
  }

  return servers
    .map((server, index: number) =>
      [
        `${index + 1}. ${server.label} (${server.id})`,
        server.enabled ? "enabled" : "disabled",
        server.server_url,
        server.server_description || null,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n");
}

/**
 * Authoritative deadline from the start of the hide transition to the native
 * window hide call. Accounts for WKWebView `requestAnimationFrame` throttling
 * in non-key windows, which stalls spring animations indefinitely and makes
 * `AnimatePresence.onExitComplete` unreliable when the panel is unfocused.
 */
const HIDE_COMMIT_DELAY_MS = 350;

/** Must match `OVERLAY_LOGICAL_WIDTH` in `src-tauri/src/lib.rs`. */
const OVERLAY_WIDTH = 600;
/** Total transparent padding around the morphing container: pt-2(8) + pb-6(24) + motion py-2(16). */
const CONTAINER_VERTICAL_PADDING = 48;
/** Max morphing-container height in chat mode. Shared with the container style. */
const MAX_CHAT_CONTAINER_HEIGHT = 640;
/** Max chat window height including the outer transparent padding. */
const MAX_CHAT_WINDOW_HEIGHT =
  MAX_CHAT_CONTAINER_HEIGHT + CONTAINER_VERTICAL_PADDING;
/** Fallback height used before fixed overlay modals finish measuring. */
const MODAL_WINDOW_HEIGHT = 980;
/** Extra breathing room around fixed overlay modals inside the native window. */
const MODAL_WINDOW_VERTICAL_PADDING = 88;
/** Upper bound for settings/help windows on taller screens. */
const MAX_MODAL_WINDOW_HEIGHT = 1120;

/** Must match `OVERLAY_LOGICAL_HEIGHT_COLLAPSED` in `src-tauri/src/lib.rs`. */
const COLLAPSED_WINDOW_HEIGHT = 80;

type OverlayVisibilityPayload =
  | {
      state: "show";
      selected_text: string | null;
      window_x: number | null;
      window_y: number | null;
      screen_bottom_y: number | null;
    }
  | { state: "hide-request" };
type OverlayState = "visible" | "hidden" | "hiding";

/**
 * Main application orchestrator for Thuki.
 *
 * Implements an adaptive morphing UI container. It starts as a minimal spotlight-style
 * input bar (`AskBarView`), then smoothly transforms into a full chat window
 * (`ConversationView`) when the user sends their first message.
 *
 * This wrapper is strictly responsible for layout morphing, global hotkeys,
 * and window visibility state, delegating UI rendering logic to the view components.
 */
function App() {
  const [query, setQuery] = useState("");
  const [overlayState, setOverlayState] = useState<OverlayState>("hidden");
  /** Non-null when the backend signals onboarding is needed; holds the current stage. */
  const [onboardingStage, setOnboardingStage] =
    useState<OnboardingStage | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  /**
   * Whether the ask-bar history panel is currently open.
   * Distinct from the chat-mode history dropdown (controlled by the same toggle
   * but rendered differently based on `isChatMode`).
   */
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  /**
   * True when the user clicked + while an unsaved conversation is active.
   * Causes the history dropdown to show a SwitchConfirmation prompt instead
   * of the conversation list.
   */
  const [pendingNewConversation, setPendingNewConversation] = useState(false);

  /**
   * Direct reference to the morphing container DOM node, stored alongside the
   * ResizeObserver so the dropdown sync effect can mutate `style.minHeight`
   * without going through React state (direct DOM mutation + CSS transition).
   */
  const morphingContainerNodeRef = useRef<HTMLDivElement | null>(null);

  const {
    conversationId,
    isSaved,
    save,
    unsave,
    persistTurn,
    loadConversation,
    deleteConversation,
    listConversations,
    reset: resetHistory,
  } = useConversationHistory();

  const {
    settings,
    updateSettings,
    refresh: refreshSettings,
  } = useAppSettings();

  /**
   * Persist a completed user/assistant turn to SQLite if the conversation
   * has been saved. Passed as `onTurnComplete` to `useOllama`.
   */
  const handleTurnComplete = useCallback(
    async (
      userMsg: Parameters<typeof persistTurn>[0],
      assistantMsg: Parameters<typeof persistTurn>[1],
    ) => {
      await persistTurn(userMsg, assistantMsg);

      const match = assistantMsg.content.match(/```json\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          if (data.action) {
            // Hardcoded Risk Permission checks
            let requiresVerification = false;
            if (data.action === "volume" && !settings?.auto_volume) {
              requiresVerification = true;
            } else if (data.action === "open" && !settings?.auto_open) {
              requiresVerification = true;
            } else if (data.action === "play" && !settings?.auto_play) {
              requiresVerification = true;
            } else if (data.action === "web" && !settings?.auto_web) {
              requiresVerification = true;
            } else if (data.action === "shell") {
              requiresVerification = true; // shell is High Risk, always verify
            } else if (data.action === "warn" || data.action === "remember" || data.action === "switch_profile") {
              requiresVerification = false; // safe operations
            } else if (!["volume", "open", "play", "web", "shell", "warn", "remember", "switch_profile"].includes(data.action)) {
              requiresVerification = true; // unrecognized command is High Risk, always verify
            }

            if (requiresVerification) {
              const verification = await invoke<TouchIDVerification>("verify_touch_id", {
                reason: `Authorize AI to execute ${data.action}`,
              });
              if (!verification.verified) {
                console.warn("Touch ID failed/canceled. Action aborted.");
                return;
              }
            }

            switch (data.action) {
              case "volume":
                await invoke("set_output_volume", { level: Number(data.parameter) });
                break;
              case "open":
                await invoke("open_target", { target: data.parameter });
                break;
              case "play":
                await invoke("play_song", { query: data.parameter, provider: null });
                break;
              case "shell":
                await invoke("run_shell_command", { command: data.parameter });
                break;
              case "web":
                await invoke("search_web", { query: data.parameter });
                break;
              case "warn":
                await invoke("show_native_alert", { title: "Security Warning", message: data.parameter });
                break;
              case "remember":
                await invoke("add_user_memory", { content: data.parameter });
                break;
              case "switch_profile":
                await invoke("switch_user_profile", { name: data.parameter });
                break;
              default:
                console.warn("Unknown action", data.action);
            }
          }
        } catch (e) {
          console.error("Failed to parse or execute AI native action:", e);
        }
      }
    },
    [persistTurn, settings],
  );

  useEffect(() => {
    applyThemeToDocument(settings?.theme);
  }, [settings?.theme]);

  const {
    messages,
    ask,
    appendLocalTurn,
    cancel,
    isGenerating,
    reset,
    loadMessages,
  } = useOllama(handleTurnComplete, settings);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Images attached to the current (unsent) message. Blob URLs render
   *  immediately; file paths are set asynchronously after Rust processing. */
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  /** URL of the image currently open in the preview modal (blob or asset URL). */
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  /** When the user submits while images are still processing, the submit
   *  intent is stored here. The effect below watches `attachedImages` and
   *  fires the actual `ask()` once every image has a resolved `filePath`. */
  const pendingSubmitRef = useRef<{
    query: string;
    context: string | undefined;
    think: boolean;
  } | null>(null);
  /** True while waiting for images to finish processing before a deferred
   *  submit. Drives the "waiting" UI state in the ask bar. */
  const [isSubmitPending, setIsSubmitPending] = useState(false);
  /** Error message from a failed /screen capture. Shown inline above the ask
   *  bar so the user knows capture failed rather than seeing no response. */
  const [captureError, setCaptureError] = useState<string | null>(null);
  /**
   * Set to true when a /screen capture is dispatched, false when it resolves
   * or when the user cancels. Lets the async tail in handleScreenSubmit
   * detect a mid-flight cancellation and skip the ask() call.
   */
  const screenCapturePendingRef = useRef(false);
  /**
   * Stores the input state (query + context) captured just before a /screen
   * submit clears them. Used by handleCancel to restore the ask bar if the
   * user aborts the in-flight capture.
   */
  const screenCaptureInputSnapshotRef = useRef<{
    query: string;
    context: string | undefined;
  } | null>(null);
  /**
   * True while a local native action such as `/web` or `/shell` is running.
   * Lets cancel abandon the eventual result without confusing it with /screen.
   */
  const nativeActionPendingRef = useRef(false);
  /**
   * Snapshot of the ask-bar input taken just before a native action clears it.
   * Used to restore the command if the user cancels the pending action locally.
   */
  const nativeActionInputSnapshotRef = useRef<{
    query: string;
    context: string | undefined;
  } | null>(null);
  /** User message shown in the chat while waiting for images to finish
   *  processing. Cleared when `ask()` fires and adds the real message. */
  const [pendingUserMessage, setPendingUserMessage] = useState<Message | null>(
    null,
  );

  /**
   * Session counter — incremented on each overlay open. Used in the motion
   * key to force AnimatePresence to fully unmount the stale tree before
   * mounting a fresh one, preventing a flash of the previous conversation.
   */
  const [sessionId, setSessionId] = useState(0);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [modelConfig, setModelConfig] = useState<{
    active: string;
    all: string[];
  } | null>(null);
  const siriBridgeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeModelLabel =
    settings?.ai_model?.trim() || modelConfig?.active || DEFAULT_MODEL_FALLBACK;

  /**
   * True when the window is near the screen bottom and should grow upward.
   * Flips the outer container to `justify-end` so content pins to the bottom.
   */
  const [growsUpward, setGrowsUpward] = useState(false);

  /**
   * Determines whether the UI has entered "chat mode" — i.e., the morphing
   * chat window state with message bubbles. Transitions from input-bar mode
   * to chat-window mode are animated via Framer Motion `layout` prop.
   */
  const isChatMode = messages.length > 0 || isGenerating || isSubmitPending;
  const isShellModalOpen = isSettingsOpen || isHelpOpen;
  const previousIsChatModeRef = useRef(isChatMode);

  /**
   * The bookmark save button is active once the AI has produced at least one
   * complete response. We check for an assistant message rather than any message
   * so the button never appears during the very first user-only half-turn.
   */
  const canSave = !isGenerating && messages.some((m) => m.role === "assistant");
  const shouldRenderOverlay = overlayState === "visible";

  /**
   * Reference stored for ResizeObserver cleanup.
   */
  const observerRef = useRef<ResizeObserver | null>(null);
  const heightMorphActiveRef = useRef(false);
  const heightMorphResetTimerRef = useRef<number | null>(null);
  const nativeRefreshOnNextResizeRef = useRef(false);
  const modalWindowOpenRef = useRef(isShellModalOpen);
  modalWindowOpenRef.current = isShellModalOpen;
  const shellModalNodeRef = useRef<HTMLDivElement | null>(null);

  /**
   * Mirror of `growsUpward` as a ref so the ResizeObserver closure can read
   * it without being recreated on each state change.
   */
  const growsUpwardRef = useRef(false);

  /**
   * Stores the window's fixed bottom Y and X for upward-growth sessions.
   * The bottom stays pinned while the top edge moves up as content grows.
   */
  const windowPosRef = useRef({ x: 0, bottomY: 0 });

  /**
   * Mirror of `isGenerating` as a ref so the ResizeObserver closure can
   * check streaming state without being recreated on each render.
   */
  const isGeneratingRef = useRef(false);
  isGeneratingRef.current = isGenerating;

  const waitForAskIdle = useCallback(async () => {
    const deadline = Date.now() + 120_000;
    while (isGeneratingRef.current) {
      if (Date.now() >= deadline) {
        throw new Error("Nexus stayed busy too long to answer Siri.");
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }, []);

  const fulfillSiriBridgeRequest = useCallback(
    async (request: SiriBridgeRequest) => {
      try {
        await waitForAskIdle();
        const playRequest = parsePlayCommandInput(request.message);
        if (playRequest) {
          const displayContent = playRequest.provider
            ? `/play ${playRequest.query} | ${playRequest.provider}`
            : `/play ${playRequest.query}`;
          const reply = await invoke<string>("play_song", {
            query: playRequest.query,
            provider: playRequest.provider ?? null,
          });
          appendLocalTurn(displayContent, reply);
          await invoke("resolve_siri_request", {
            requestId: request.id,
            reply,
            error: null,
          });
          return;
        }
        const { assistantMsg } = await ask(request.message);
        await invoke("resolve_siri_request", {
          requestId: request.id,
          reply: assistantMsg.content,
          error: null,
        });
      } catch (error) {
        await invoke("resolve_siri_request", {
          requestId: request.id,
          reply: null,
          error:
            error instanceof Error
              ? error.message
              : "Nexus could not complete the Siri request.",
        }).catch(() => undefined);
      }
    },
    [appendLocalTurn, ask, waitForAskIdle],
  );

  const drainPendingSiriRequests = useCallback(async () => {
    const pending = await invoke<SiriBridgeRequest[]>(
      "claim_pending_siri_requests",
    );
    if (pending.length === 0) {
      return;
    }

    siriBridgeQueueRef.current = siriBridgeQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        for (const request of pending) {
          await fulfillSiriBridgeRequest(request);
        }
      });

    await siriBridgeQueueRef.current;
  }, [fulfillSiriBridgeRequest]);

  /**
   * High-water mark for window height during streaming. While the LLM is
   * generating, the window only grows (never shrinks) to prevent jitter
   * from Streamdown's block-element reflows. Reset when generation ends
   * or a new session starts.
   */
  const maxHeightRef = useRef(0);

  /**
   * Callback ref to reliably attach the ResizeObserver when the conditionally
   * rendered Framer Motion container actually mounts in the DOM. This fixes
   * the bug where a standard useEffect would run before the DOM node was ready,
   * leaving the native window stuck at 600x700.
   *
   * When `growsUpwardRef` is true (window near screen bottom), the observer
   * also repositions the window upward to keep its bottom pinned as the
   * conversation grows.
   */
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    morphingContainerNodeRef.current = node;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (node) {
      const observer = new ResizeObserver(
        /* v8 ignore start -- ResizeObserver callback requires a native browser resize event */
        (entries) => {
          requestAnimationFrame(() => {
            for (const entry of entries) {
              if (modalWindowOpenRef.current) {
                continue;
              }
              const rect = entry.target.getBoundingClientRect();
              // Total vertical room: 8px (pt-2) + 24px (pb-6) + 16px (motion py-2) = 48px.
              // This ensures the tightened drop shadows aren't clipped by the native window edge.
              let targetHeight =
                Math.ceil(rect.height) + CONTAINER_VERTICAL_PADDING;

              // During streaming, only allow the window to grow (never
              // shrink) to prevent jitter from Streamdown block reflows.
              if (isGeneratingRef.current) {
                if (targetHeight > maxHeightRef.current) {
                  maxHeightRef.current = targetHeight;
                } else {
                  targetHeight = maxHeightRef.current;
                }
              }

              if (growsUpwardRef.current) {
                // Grow upward: pin the window bottom and expand the top edge.
                // Clamp Y so the window never extends above the menu bar.
                const { x, bottomY } = windowPosRef.current;
                const newY = Math.max(0, bottomY - targetHeight);
                void invoke("set_window_frame", {
                  x,
                  y: newY,
                  width: OVERLAY_WIDTH,
                  height: targetHeight,
                });
              } else {
                const shouldForceRefresh =
                  nativeRefreshOnNextResizeRef.current &&
                  targetHeight > COLLAPSED_WINDOW_HEIGHT;
                if (shouldForceRefresh) {
                  nativeRefreshOnNextResizeRef.current = false;
                }

                void invoke("set_window_size", {
                  width: OVERLAY_WIDTH,
                  height: targetHeight,
                  forceRefresh: shouldForceRefresh || null,
                });
              }
            }
          });
        },
        /* v8 ignore stop */
      );

      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const resizeOverlayWindow = useCallback((targetHeight: number) => {
    const clampedHeight = Math.max(COLLAPSED_WINDOW_HEIGHT, targetHeight);
    if (growsUpwardRef.current) {
      const { x, bottomY } = windowPosRef.current;
      const newY = Math.max(0, bottomY - clampedHeight);
      void invoke("set_window_frame", {
        x,
        y: newY,
        width: OVERLAY_WIDTH,
        height: clampedHeight,
      });
      return;
    }

    const shouldForceRefresh =
      nativeRefreshOnNextResizeRef.current &&
      clampedHeight > COLLAPSED_WINDOW_HEIGHT;
    if (shouldForceRefresh) {
      nativeRefreshOnNextResizeRef.current = false;
    }

    void invoke("set_window_size", {
      width: OVERLAY_WIDTH,
      height: clampedHeight,
      forceRefresh: shouldForceRefresh || null,
    });
  }, []);

  const setShellModalNode = useCallback((node: HTMLDivElement | null) => {
    shellModalNodeRef.current = node;
  }, []);

  const resizeShellModalWindow = useCallback(() => {
    const modalNode = shellModalNodeRef.current;
    if (!modalNode) {
      resizeOverlayWindow(MODAL_WINDOW_HEIGHT);
      return;
    }

    const targetHeight =
      Math.ceil(modalNode.getBoundingClientRect().height) +
      MODAL_WINDOW_VERTICAL_PADDING;
    resizeOverlayWindow(Math.min(MAX_MODAL_WINDOW_HEIGHT, targetHeight));
  }, [resizeOverlayWindow]);

  const syncChatWindowHeight = useCallback(() => {
    if (overlayState !== "visible" || isShellModalOpen) {
      return;
    }

    const container = morphingContainerNodeRef.current;
    if (!container) {
      return;
    }

    const targetHeight =
      Math.max(
        Math.ceil(container.getBoundingClientRect().height),
        Math.ceil(container.scrollHeight),
      ) + CONTAINER_VERTICAL_PADDING;
    resizeOverlayWindow(Math.min(MAX_CHAT_WINDOW_HEIGHT, targetHeight));
  }, [isShellModalOpen, overlayState, resizeOverlayWindow]);

  /**
   * Reset the high-water mark when streaming finishes so the window can
   * shrink back to its natural content height on the next resize event.
   */
  useEffect(() => {
    if (!isGenerating) {
      maxHeightRef.current = 0;
    }
  }, [isGenerating]);

  useEffect(() => {
    if (overlayState !== "visible") {
      return;
    }

    if (isShellModalOpen) {
      return;
    }

    syncChatWindowHeight();
  }, [isShellModalOpen, overlayState, syncChatWindowHeight]);

  useLayoutEffect(() => {
    if (!isShellModalOpen || overlayState !== "visible") {
      return;
    }

    const modalNode = shellModalNodeRef.current;
    if (!modalNode) {
      resizeOverlayWindow(MODAL_WINDOW_HEIGHT);
      return;
    }

    const sync = () => {
      requestAnimationFrame(() => {
        resizeShellModalWindow();
      });
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(modalNode);
    return () => observer.disconnect();
  }, [
    isShellModalOpen,
    overlayState,
    resizeOverlayWindow,
    resizeShellModalWindow,
  ]);

  /**
   * Replays the entrance sequence by transitioning the overlay to the visible state.
   * Clears conversation state for a fresh session each time the overlay appears.
   */
  const replayEntranceAnimation = useCallback(
    (
      context: string | null,
      windowX: number | null,
      windowY: number | null,
      screenBottomY: number | null,
    ) => {
      const shouldGrowUp =
        windowY !== null &&
        screenBottomY !== null &&
        windowY + MAX_CHAT_WINDOW_HEIGHT > screenBottomY;
      growsUpwardRef.current = shouldGrowUp;
      setGrowsUpward(shouldGrowUp);
      maxHeightRef.current = 0;
      if (shouldGrowUp && windowX !== null && windowY !== null) {
        windowPosRef.current = {
          x: windowX,
          bottomY: windowY + COLLAPSED_WINDOW_HEIGHT,
        };
      }
      const prefilledSelection = context?.trim() || "";
      setSessionId((id) => id + 1);
      setQuery(prefilledSelection);
      setSelectedContext(null);
      setIsHistoryOpen(false);
      setIsSettingsOpen(false);
      setIsHelpOpen(false);
      setAttachedImages((prev) => {
        for (const img of prev) URL.revokeObjectURL(img.blobUrl);
        return [];
      });
      pendingSubmitRef.current = null;
      screenCapturePendingRef.current = false;
      screenCaptureInputSnapshotRef.current = null;
      setIsSubmitPending(false);
      setPendingUserMessage(null);
      setCaptureError(null);

      reset();
      resetHistory();
      setOverlayState("visible");
    },
    [reset, resetHistory],
  );

  /**
   * Moves the overlay into an exit phase. The actual Tauri window hide call is
   * deferred until Framer Motion finishes the exit transition.
   */
  const requestHideOverlay = useCallback(() => {
    cancel();
    growsUpwardRef.current = false;
    setGrowsUpward(false);
    screenCapturePendingRef.current = false;
    screenCaptureInputSnapshotRef.current = null;
    setSelectedContext(null);
    setPreviewImageUrl(null);
    setIsSettingsOpen(false);
    setIsHelpOpen(false);
    setAttachedImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.blobUrl);
      return [];
    });
    setOverlayState((currentState) => {
      if (currentState === "hidden" || currentState === "hiding") {
        return currentState;
      }
      return "hiding";
    });
  }, [cancel]);

  /** Ref attached to the chat-mode history dropdown for click-outside detection. */
  const historyDropdownRef = useRef<HTMLDivElement>(null);

  /** Toggles the history panel open/closed. */
  const handleHistoryToggle = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);

  /**
   * Close the chat-mode history dropdown when the user clicks outside it.
   * Clicks on the toggle button itself are excluded so the button's own
   * onClick handler (handleHistoryToggle) can manage the toggle normally.
   */
  useEffect(() => {
    if (!(isChatMode && isHistoryOpen)) return;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        historyDropdownRef.current?.contains(target) ||
        target.closest?.("[data-history-toggle]")
      ) {
        return;
      }
      setIsHistoryOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [isChatMode, isHistoryOpen]);

  // Clear any pending new-conversation confirmation whenever the panel closes.
  // Uses a ref-based approach to avoid the @eslint-react/set-state-in-effect
  // warning from calling setState synchronously inside an effect body.
  const prevHistoryOpenRef = useRef(isHistoryOpen);
  const prevHeightRef = useRef<number>(COLLAPSED_WINDOW_HEIGHT);
  if (prevHistoryOpenRef.current && !isHistoryOpen) {
    setPendingNewConversation(false);
  }
  prevHistoryOpenRef.current = isHistoryOpen;

  /**
   * When a submit flips the UI from ask-bar mode into chat mode while the
   * window is pinned near the bottom edge, animate the container from its
   * current height to the fixed full chat height. This is intentionally scoped
   * to the upward-growth path so the downward path remains unchanged.
   */
  useLayoutEffect(() => {
    /* v8 ignore start -- ResizeObserver + DOM mutations require a real browser */
    const container = morphingContainerNodeRef.current;
    const wasChatMode = previousIsChatModeRef.current;
    previousIsChatModeRef.current = isChatMode;

    if (!wasChatMode && isChatMode && !growsUpward) {
      nativeRefreshOnNextResizeRef.current = true;
    }

    if (heightMorphResetTimerRef.current !== null) {
      window.clearTimeout(heightMorphResetTimerRef.current);
      heightMorphResetTimerRef.current = null;
    }

    if (!container) return;
    if (!growsUpward || isHistoryOpen || !isChatMode || wasChatMode) {
      heightMorphActiveRef.current = false;
      return;
    }

    const startHeight =
      container.offsetHeight > 0
        ? container.offsetHeight
        : prevHeightRef.current;
    container.style.transition = "none";
    container.style.minHeight = "";
    container.style.height = `${startHeight}px`;
    void container.offsetHeight;

    const frameId = requestAnimationFrame(() => {
      // 0.4s and slightly softer cubic bezier specifically for upward morph
      container.style.transition = "height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)";
      container.style.height = `${MAX_CHAT_CONTAINER_HEIGHT}px`;
    });
    heightMorphActiveRef.current = true;
    heightMorphResetTimerRef.current = window.setTimeout(() => {
      if (morphingContainerNodeRef.current !== container) {
        return;
      }
      heightMorphActiveRef.current = false;
      container.style.height = "";
      container.style.transition =
        "height 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
    }, 420);

    return () => {
      cancelAnimationFrame(frameId);
      if (heightMorphResetTimerRef.current !== null) {
        window.clearTimeout(heightMorphResetTimerRef.current);
        heightMorphResetTimerRef.current = null;
      }
    };
    /* v8 ignore stop */
  }, [growsUpward, isChatMode, isHistoryOpen]);

  useLayoutEffect(() => {
    if (!isChatMode || isShellModalOpen || overlayState !== "visible") {
      return;
    }

    /* v8 ignore start -- multi-pass scheduling depends on a real browser event loop */
    const rafIds: number[] = [];
    const timeoutIds: number[] = [];
    const scheduleSync = () => {
      syncChatWindowHeight();
    };

    scheduleSync();
    rafIds.push(requestAnimationFrame(scheduleSync));
    rafIds.push(
      requestAnimationFrame(() => {
        scheduleSync();
        rafIds.push(requestAnimationFrame(scheduleSync));
      }),
    );
    timeoutIds.push(window.setTimeout(scheduleSync, 60));
    timeoutIds.push(window.setTimeout(scheduleSync, 180));

    return () => {
      for (const id of rafIds) {
        cancelAnimationFrame(id);
      }
      for (const id of timeoutIds) {
        window.clearTimeout(id);
      }
    };
    /* v8 ignore stop */
  }, [
    isChatMode,
    isGenerating,
    isShellModalOpen,
    isSubmitPending,
    messages.length,
    overlayState,
    pendingUserMessage,
    syncChatWindowHeight,
  ]);

  /**
   * Observes the dropdown's height while it's open and mutates the morphing
   * container's `min-height` style directly (bypassing React state) so the
   * native window grows exactly as tall as the dropdown needs. A CSS transition
   * on the container drives the smooth resize; the existing ResizeObserver fires
   * per-frame and calls `setSize()` as the transition runs.
   *
   * Direct DOM mutation avoids the React state → Framer Motion → ResizeObserver
   * indirect chain that broke timing. ResizeObserver tracks async conversation
   * list load so `min-height` stays accurate as content populates.
   */
  useLayoutEffect(() => {
    /* v8 ignore start -- ResizeObserver + DOM mutations require a real browser */
    const container = morphingContainerNodeRef.current;
    if (!container) return;

    // Track the height when we are NOT in chat mode natively.
    if (!isChatMode) {
      const h = container.offsetHeight;
      // offsetHeight might read 0 if hidden, so default to collapsed
      prevHeightRef.current = h > 0 ? h : COLLAPSED_WINDOW_HEIGHT;
      heightMorphActiveRef.current = false;
      container.style.transition =
        "min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
      container.style.height = "";
      container.style.minHeight = "";
      return;
    }

    if (!isHistoryOpen) {
      container.style.transition =
        "min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
      if (!heightMorphActiveRef.current) {
        container.style.height = "";
      }
      container.style.minHeight = "";
      return;
    }

    const dropdown = historyDropdownRef.current;
    if (!dropdown) return;

    container.style.transition =
      "min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)";
    container.style.height = ""; // Let history panel dictate it via minHeight

    const sync = () => {
      container.style.minHeight = `${dropdown.offsetTop + dropdown.offsetHeight + 8}px`;
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(dropdown);
    return () => ro.disconnect();
    /* v8 ignore stop */
  }, [isChatMode, isHistoryOpen]);

  /**
   * Toggles the save state of the current conversation.
   * - Not saved → saves to SQLite (bookmark fills).
   * - Already saved → deletes from SQLite, marks unsaved (bookmark empties);
   *   messages remain in the UI so the session can be re-saved if desired.
   */
  const handleSave = useCallback(async () => {
    try {
      if (isSaved) {
        await unsave();
      } else {
        await save(messages, activeModelLabel);
      }
    } catch {
      // State stays unchanged on failure; feedback is implicit in the icon.
    }
  }, [activeModelLabel, isSaved, unsave, save, messages]);

  /**
   * Loads a conversation from history, replacing the current session.
   *
   * Closes the history panel regardless of success or failure: on success the
   * loaded messages replace the current session; on failure the current session
   * is preserved and the panel is dismissed so the user is not left in a
   * half-open state.
   */
  const handleLoadConversation = useCallback(
    async (id: string) => {
      try {
        const loaded = await loadConversation(id);
        loadMessages(loaded);
      } catch {
        // Load failed — current session is preserved intact.
      } finally {
        setIsHistoryOpen(false);
      }
    },
    [loadConversation, loadMessages],
  );

  /**
   * Saves the current unsaved session then loads the requested conversation.
   *
   * If save fails the operation is aborted — we do not load the target
   * conversation because the current session has not been persisted yet.
   * If save succeeds but load fails the panel is still dismissed; the
   * current session has been saved so no data is lost.
   */
  const handleSaveAndLoad = useCallback(
    async (id: string) => {
      try {
        await save(messages, activeModelLabel);
      } catch {
        // Save failed — abort to avoid leaving the current session unprotected.
        return;
      }
      try {
        const loaded = await loadConversation(id);
        loadMessages(loaded);
      } catch {
        // Load failed — save already committed; dismiss panel, keep current view.
      } finally {
        setIsHistoryOpen(false);
      }
    },
    [activeModelLabel, save, messages, loadConversation, loadMessages],
  );

  /**
   * Deletes a conversation from the history panel.
   *
   * When the deleted conversation is the currently active one, only the
   * persistence state (`resetHistory`) is cleared — messages remain visible
   * so the user can continue chatting or re-save. The error is intentionally
   * re-thrown so `HistoryPanel` can roll back its optimistic removal.
   */
  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (id === conversationId) {
        resetHistory();
      }
    },
    [deleteConversation, conversationId, resetHistory],
  );

  /**
   * Shared reset sequence for all "start a new conversation" paths.
   */
  const resetForNewConversation = useCallback(() => {
    reset();
    resetHistory();
    setIsHistoryOpen(false);
    setQuery("");
    setAttachedImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.blobUrl);
      return [];
    });
    pendingSubmitRef.current = null;
    screenCapturePendingRef.current = false;
    screenCaptureInputSnapshotRef.current = null;
    setIsSubmitPending(false);
    setPendingUserMessage(null);
  }, [reset, resetHistory]);

  /**
   * Starts a fresh conversation from within conversation view.
   * If the current conversation has unsaved messages, opens the history
   * dropdown and surfaces a SwitchConfirmation prompt instead of resetting
   * immediately.
   */
  const handleNewConversation = useCallback(() => {
    if (!isSaved && messages.length > 0) {
      setPendingNewConversation(true);
      setIsHistoryOpen(true);
      return;
    }
    resetForNewConversation();
  }, [isSaved, messages.length, resetForNewConversation]);

  /** Saves the current conversation then starts a fresh one. */
  const handleSaveAndNew = useCallback(async () => {
    try {
      await save(messages, activeModelLabel);
    } catch {
      return;
    }
    resetForNewConversation();
  }, [activeModelLabel, save, messages, resetForNewConversation]);

  /** Discards the current conversation and starts a fresh one. */
  const handleJustNew = useCallback(() => {
    resetForNewConversation();
  }, [resetForNewConversation]);

  /**
   * Handles newly attached image files. Creates blob URLs immediately for
   * instant thumbnail rendering, then processes each file in the background
   * via base64-encoded IPC to the Rust backend.
   */
  const handleImagesAttached = useCallback((files: File[]) => {
    const newImages: AttachedImage[] = files.map((file) => ({
      id: crypto.randomUUID(),
      blobUrl: URL.createObjectURL(file),
      filePath: null,
    }));

    setAttachedImages((prev) => [...prev, ...newImages]);

    // Defer backend processing to the next frame so React can render the
    // blob URL thumbnails immediately — keeps the UI responsive while
    // FileReader + IPC serialisation happen in subsequent event-loop ticks.
    requestAnimationFrame(() => {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const imageId = newImages[i].id;

        const reader = new FileReader();
        reader.onload = () => {
          // Extract pure base64 from the data URL (strip "data:image/png;base64,").
          const base64 = (reader.result as string).split(",")[1];
          invoke<string>("save_image_command", { imageDataBase64: base64 })
            .then((filePath) => {
              setAttachedImages((prev) =>
                prev.map((img) =>
                  img.id === imageId ? { ...img, filePath } : img,
                ),
              );
            })
            .catch(() => {
              setAttachedImages((prev) => {
                for (const img of prev) {
                  if (img.id === imageId) URL.revokeObjectURL(img.blobUrl);
                }
                return prev.filter((img) => img.id !== imageId);
              });
            });
        };
        reader.readAsDataURL(file);
      }
    });
  }, []);

  /**
   * Invokes the Rust `capture_screenshot` command, which hides the window,
   * lets the user drag-select a screen region, then returns the captured image
   * as a base64 PNG string (or null if the user cancelled).
   * On success, converts the base64 to a File and feeds it into the existing
   * handleImagesAttached pipeline — identical to a paste or drag-drop.
   */
  const handleScreenshot = useCallback(async () => {
    /* v8 ignore start -- defensive guard: button is always disabled at max images, so this branch is unreachable through normal UI interaction */
    if (attachedImages.length >= MAX_IMAGES) return;
    /* v8 ignore stop */
    const base64 = await invoke<string | null>("capture_screenshot_command");
    if (!base64) return;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/png" });
    const file = new File([blob], "screenshot.png", { type: "image/png" });
    handleImagesAttached([file]);
  }, [attachedImages, handleImagesAttached]);

  /** Removes an attached image from state, revokes the blob URL, and
   *  deletes the staged file from disk if processing completed. */
  const handleImageRemove = useCallback((id: string) => {
    setAttachedImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.blobUrl);
        if (img.filePath) {
          void invoke("remove_image_command", { path: img.filePath });
        }
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  /** Opens the preview modal for an attached image (identified by ID).
   *  The ID always comes from the thumbnail component which only renders
   *  items present in attachedImages, so the find always succeeds. */
  const handleAskBarImagePreview = useCallback(
    (id: string) => {
      setPreviewImageUrl(attachedImages.find((i) => i.id === id)!.blobUrl);
    },
    [attachedImages],
  );

  /** Opens the preview modal for a chat history image (identified by file path). */
  const handleChatImagePreview = useCallback((path: string) => {
    setPreviewImageUrl(path.startsWith("blob:") ? path : convertFileSrc(path));
  }, []);

  /** Fires the actual ask() call and cleans up attached images + input. */
  const executeSubmit = useCallback(
    (submitQuery: string, context: string | undefined, think?: boolean) => {
      const readyPaths = attachedImages
        .filter((img) => img.filePath !== null)
        .map((img) => img.filePath as string);
      const images = readyPaths.length > 0 ? readyPaths : undefined;
      ask(submitQuery, context, images, think);
      setSelectedContext(null);
      setQuery("");
      for (const img of attachedImages) {
        URL.revokeObjectURL(img.blobUrl);
      }
      setAttachedImages([]);
      inputRef.current!.style.height = "auto";
    },
    [ask, attachedImages, setSelectedContext],
  );

  /**
   * Async handler for the `/screen` command path. Invokes the Rust
   * `capture_full_screen_command`, which silently captures the screen
   * (excluding Thuki's own windows) and returns the saved file path.
   * On success, merges the screenshot path with any manually attached
   * images and calls ask(). On error, restores the query so no input is lost.
   */
  const handleScreenSubmit = useCallback(
    async (fullQuery: string, think?: boolean) => {
      // eslint-disable-next-line no-control-regex
      const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
      const sanitized = selectedContext
        ?.replace(CONTROL_CHARS, "")
        .slice(0, quote.maxContextLength);
      const context = sanitized?.trim() ? sanitized : undefined;

      // Snapshot display paths for the pending bubble: use resolved file paths
      // for already-processed images, blob URLs for still-processing ones.
      const existingDisplayPaths = attachedImages.map(
        (img) => img.filePath ?? img.blobUrl,
      );

      // Store the original input so handleCancel can restore it if the user
      // aborts the capture before it resolves.
      screenCaptureInputSnapshotRef.current = {
        query: fullQuery,
        context,
      };

      // Immediately show the user's message in chat with a loading placeholder
      // for the screenshot. This prevents double-submit spam and gives instant
      // feedback that the capture is in progress.
      screenCapturePendingRef.current = true;
      setIsSubmitPending(true);
      setPendingUserMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: fullQuery,
        quotedText: context,
        imagePaths: [...existingDisplayPaths, SCREEN_CAPTURE_PLACEHOLDER],
      });
      setQuery("");
      setSelectedContext(null);
      /* v8 ignore start -- inputRef always set when overlay is visible */
      if (inputRef.current) inputRef.current.style.height = "auto";
      /* v8 ignore stop */

      let screenshotPath: string;
      try {
        screenshotPath = await invoke<string>("capture_full_screen_command");
      } catch (e) {
        screenCapturePendingRef.current = false;
        screenCaptureInputSnapshotRef.current = null;
        // Capture failed: restore input state so the user can retry or edit.
        setIsSubmitPending(false);
        setPendingUserMessage(null);
        setQuery(fullQuery);
        setSelectedContext(context ?? null);
        // Surface the Rust error directly: the backend already provides
        // descriptive messages (permission prompts, null-image diagnostics, etc.).
        // Tauri v2 rejects with the Err(String) value as a plain string.
        setCaptureError(
          typeof e === "string"
            ? e
            : e instanceof Error
              ? e.message
              : String(e),
        );
        return;
      }

      // Check for mid-flight cancellation before touching any state.
      // handleCancel sets screenCapturePendingRef.current = false as a signal.
      const wasCancelled = !screenCapturePendingRef.current;
      screenCapturePendingRef.current = false;
      screenCaptureInputSnapshotRef.current = null;
      if (wasCancelled) return;

      // Capture succeeded: finalize the submit.
      setCaptureError(null);
      setIsSubmitPending(false);
      setPendingUserMessage(null);

      const readyPaths = attachedImages
        .filter((img) => img.filePath !== null)
        .map((img) => img.filePath as string);
      readyPaths.push(screenshotPath);

      ask(fullQuery, context, readyPaths, think);
      for (const img of attachedImages) {
        URL.revokeObjectURL(img.blobUrl);
      }
      setAttachedImages([]);
    },
    [selectedContext, attachedImages, ask, setSelectedContext, setCaptureError],
  );

  const handleNativeActionSubmit = useCallback(
    async (
      fullQuery: string,
      strippedMessage: string,
      nativeCommand: NativeActionCommand,
    ) => {
      // eslint-disable-next-line no-control-regex
      const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
      const sanitized = selectedContext
        ?.replace(CONTROL_CHARS, "")
        .slice(0, quote.maxContextLength);
      const context = sanitized?.trim() ? sanitized : undefined;

      nativeActionPendingRef.current = true;
      nativeActionInputSnapshotRef.current = {
        query: fullQuery,
        context,
      };
      setIsSubmitPending(true);
      setPendingUserMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: fullQuery,
        quotedText: context,
      });
      setQuery("");
      setSelectedContext(null);
      inputRef.current!.style.height = "auto";

      let assistantContent = "";
      let errorKind: Message["errorKind"];

      try {
        switch (nativeCommand) {
          case "/web": {
            const queryText = strippedMessage.trim() || context;
            if (!queryText) {
              throw new Error(
                "Use /web followed by a search query or select text first.",
              );
            }
            assistantContent = await invoke<string>("search_web", {
              query: queryText,
            });
            break;
          }

          case "/open": {
            const target = strippedMessage.trim() || context;
            if (!target) {
              throw new Error("Use /open with a URL, path, or app name.");
            }
            assistantContent = await invoke<string>("open_target", { target });
            break;
          }

          case "/play": {
            const payload = (strippedMessage.trim() || context || "")
              .split("|")
              .map((part) => part.trim());
            const queryText = payload[0];
            if (!queryText) {
              throw new Error(
                "Use `/play song title` or `/play song title | youtube|spotify|apple-music`.",
              );
            }
            assistantContent = await invoke<string>("play_song", {
              query: queryText,
              provider: payload[1] || null,
            });
            break;
          }

          case "/shell": {
            const command = strippedMessage.trim();
            if (!command) {
              throw new Error(
                "Use /shell followed by the command you want to run.",
              );
            }
            const result = await invoke<ShellCommandResult>(
              "run_shell_command",
              {
                command,
              },
            );
            assistantContent = formatShellResult(result);
            break;
          }

          case "/volume": {
            const volumeText = strippedMessage.match(/\d{1,3}/)?.[0];
            if (!volumeText) {
              throw new Error(
                "Use /volume followed by a number from 0 to 100.",
              );
            }
            const level = Number(volumeText);
            if (!Number.isFinite(level)) {
              throw new Error(
                "Volume must be a valid number between 0 and 100.",
              );
            }
            assistantContent = await invoke<string>("set_output_volume", {
              level,
            });
            break;
          }

          case "/menuicon": {
            const normalized = strippedMessage.trim().toLowerCase();
            if (!normalized) {
              throw new Error("Use /menuicon hide or /menuicon show.");
            }
            const visible = ["show", "on", "visible"].includes(normalized);
            const hidden = ["hide", "off", "hidden"].includes(normalized);
            if (!visible && !hidden) {
              throw new Error("Use /menuicon hide or /menuicon show.");
            }
            await invoke<boolean>("set_menu_bar_icon_visible", {
              visible,
            });
            assistantContent = visible
              ? "Menu bar icon shown. You can now use the tray again."
              : "Menu bar icon hidden. Open Nexus AI with Ctrl twice and use `/menuicon show` anytime to bring it back.";
            break;
          }

          case "/touchid": {
            const result = await invoke<TouchIDVerification>(
              "verify_touch_id",
              {
                reason:
                  strippedMessage.trim() ||
                  "Authenticate to continue in Nexus AI.",
              },
            );
            assistantContent = result.verified
              ? `Touch ID verified on ${result.biometry}.\n\n${result.message}`
              : `Touch ID was not verified.\n\n${result.message}`;
            if (!result.verified) {
              errorKind = "Other";
            }
            break;
          }

          case "/provider": {
            const [provider, ...modelParts] = strippedMessage
              .trim()
              .split(/\s+/);
            if (!provider) {
              throw new Error(
                "Use /provider ollama, openai <model>, google <model>, anthropic <model>, xai <model>, or groq <model>.",
              );
            }

            const providerDefaults: Record<string, string> = {
              ollama: "llama3.2",
              openai: "gpt-5-mini",
              google: "gemini-3.1-flash",
              anthropic: "claude-3-7-sonnet-latest",
              xai: "grok-3-mini",
              groq: "llama-3.3-70b-versatile",
            };

            const patch: AppSettingsPatch = {
              ai_provider: provider,
            };
            const model = modelParts.join(" ").trim();
            patch.ai_model = model || providerDefaults[provider.toLowerCase()];

            const next = await updateSettings(patch);
            assistantContent = `AI provider set to ${next.ai_provider} with model ${next.ai_model}.`;
            break;
          }

          case "/apikey": {
            const [provider, ...keyParts] = strippedMessage.trim().split(/\s+/);
            const apiKey = keyParts.join(" ").trim();

            if (!provider || !apiKey) {
              throw new Error(
                "Use `/apikey openai YOUR_KEY`, `/apikey google YOUR_KEY`, `/apikey anthropic YOUR_KEY`, `/apikey xai YOUR_KEY`, `/apikey github YOUR_TOKEN`, or `/apikey exa YOUR_KEY`.",
              );
            }

            const normalized = provider.toLowerCase();
            const patch: AppSettingsPatch = {};

            switch (normalized) {
              case "openai":
                patch.openai_api_key = apiKey;
                break;
              case "google":
                patch.google_api_key = apiKey;
                break;
              case "anthropic":
                patch.anthropic_api_key = apiKey;
                break;
              case "xai":
                patch.xai_api_key = apiKey;
                break;
              case "github":
                patch.github_access_token = apiKey;
                break;
              case "exa":
                patch.exa_api_key = apiKey;
                break;
              default:
                throw new Error(
                  "Supported API key targets are openai, google, anthropic, xai, github, and exa.",
                );
            }

            await updateSettings(patch);
            assistantContent = `Stored the ${normalized} API key in Nexus AI settings.`;
            break;
          }

          case "/autolaunch": {
            const normalized = strippedMessage.trim().toLowerCase();
            if (!normalized) {
              throw new Error("Use /autolaunch on or /autolaunch off.");
            }
            const enabled = ["on", "true", "enabled", "enable", "yes"].includes(
              normalized,
            );
            const disabled = [
              "off",
              "false",
              "disabled",
              "disable",
              "no",
            ].includes(normalized);
            if (!enabled && !disabled) {
              throw new Error("Use /autolaunch on or /autolaunch off.");
            }
            const next = await updateSettings({
              launch_at_login: enabled,
            });
            assistantContent = next.launch_at_login
              ? "Auto-launch enabled. Nexus AI will now start automatically when you log in."
              : "Auto-launch disabled. Nexus AI will no longer start at login.";
            break;
          }

          case "/comet": {
            const maybeUrl = strippedMessage.trim();
            assistantContent = await invoke<string>(
              "comet_launch_and_connect",
              {
                options: {
                  target: settings?.comet_app_target ?? null,
                  host: settings?.comet_host ?? null,
                  port: settings?.comet_port ?? null,
                  url: maybeUrl || null,
                },
              },
            );
            break;
          }

          case "/shareauth": {
            interface AuthSyncStatus {
              identity_shared: boolean;
              workspace_shared: boolean;
              message: string;
            }
            const status = await invoke<AuthSyncStatus>("comet_share_auth");
            assistantContent = status.message;
            break;
          }

          case "/github": {
            const [mode, ...parts] = strippedMessage.trim().split(/\s+/);
            const normalized = (mode || "help").toLowerCase();

            if (normalized === "repo" || normalized === "repos") {
              const query = parts.join(" ").trim();
              if (!query) {
                throw new Error("Use `/github repo QUERY`.");
              }
              const items = await invoke<GitHubRepositorySummary[]>(
                "github_search_repositories",
                {
                  query,
                  limit: 6,
                },
              );
              assistantContent = formatGitHubRepositories(items);
              break;
            }

            if (normalized === "issues" || normalized === "issue") {
              const query = parts.join(" ").trim();
              if (!query) {
                throw new Error("Use `/github issues QUERY`.");
              }
              const items = await invoke<GitHubIssueSummary[]>(
                "github_search_issues",
                {
                  query,
                  limit: 6,
                },
              );
              assistantContent = formatGitHubIssues(items);
              break;
            }

            if (normalized === "prs" || normalized === "pulls") {
              const [owner, repo, state] = parts;
              if (!owner || !repo) {
                throw new Error(
                  "Use `/github prs OWNER REPO [open|closed|all]`.",
                );
              }
              const items = await invoke<GitHubPullRequestSummary[]>(
                "github_list_pull_requests",
                {
                  owner,
                  repo,
                  state: state || null,
                  limit: 10,
                },
              );
              assistantContent = formatGitHubPullRequests(items);
              break;
            }

            if (normalized === "file") {
              const [owner, repo, filePath, ...referenceParts] = parts;
              if (!owner || !repo || !filePath) {
                throw new Error(
                  "Use `/github file OWNER REPO PATH [branch-or-sha]`.",
                );
              }
              const item = await invoke<GitHubFileContentResult>(
                "github_get_file_contents",
                {
                  owner,
                  repo,
                  path: filePath,
                  reference:
                    referenceParts.length > 0
                      ? referenceParts.join(" ").trim()
                      : null,
                },
              );
              assistantContent = formatGitHubFile(item);
              break;
            }

            throw new Error(
              "Use `/github repo QUERY`, `/github issues QUERY`, `/github prs OWNER REPO [state]`, or `/github file OWNER REPO PATH [ref]`.",
            );
          }

          case "/mcp": {
            const [mode, ...parts] = strippedMessage.trim().split(/\s+/);
            const normalized = (mode || "list").toLowerCase();
            const currentServers = settings?.mcp_http_servers ?? [];

            if (normalized === "list") {
              assistantContent = formatMcpServers(settings);
              break;
            }

            if (normalized === "add") {
              const preset = (parts[0] || "exa").toLowerCase();
              if (preset !== "exa") {
                throw new Error(
                  "Only the `exa` preset is built in. Use `/mcp set LABEL | URL | optional Authorization` for custom servers.",
                );
              }

              const exaServer = {
                id: "exa-web-search",
                label: "Exa Web Search",
                server_url: "https://mcp.exa.ai/mcp",
                server_description:
                  "Remote Exa MCP server for web search and code-context retrieval.",
                authorization: null,
                headers: (() => {
                  const headers: Record<string, string> = {};
                  if (settings?.exa_api_key?.trim()) {
                    headers["x-api-key"] = settings.exa_api_key.trim();
                  }
                  return headers;
                })(),
                enabled: true,
              };

              const nextServers = [
                ...currentServers.filter(
                  (server) => server.id !== exaServer.id,
                ),
                exaServer,
              ];
              const next = await updateSettings({
                mcp_http_servers: nextServers,
              });
              assistantContent = formatMcpServers(next);
              break;
            }

            if (normalized === "set") {
              const payload = strippedMessage
                .slice(mode.length)
                .split("|")
                .map((part) => part.trim());
              if (payload.length < 2 || !payload[0] || !payload[1]) {
                throw new Error(
                  "Use `/mcp set Label | https://server.example/mcp | optional Authorization`.",
                );
              }

              const id = slugifyMcpId(payload[0]);
              if (!id) {
                throw new Error("The MCP label must contain readable text.");
              }

              const nextServers = [
                ...currentServers.filter((server) => server.id !== id),
                {
                  id,
                  label: payload[0],
                  server_url: payload[1],
                  server_description: null,
                  authorization: payload[2] || null,
                  headers: {},
                  enabled: true,
                },
              ];
              const next = await updateSettings({
                mcp_http_servers: nextServers,
              });
              assistantContent = formatMcpServers(next);
              break;
            }

            if (normalized === "enable" || normalized === "disable") {
              const id = parts.join(" ").trim();
              if (!id) {
                throw new Error(`Use \`/mcp ${normalized} SERVER_ID\`.`);
              }

              const nextServers = currentServers.map((server) =>
                server.id === id
                  ? { ...server, enabled: normalized === "enable" }
                  : server,
              );
              const next = await updateSettings({
                mcp_http_servers: nextServers,
              });
              assistantContent = formatMcpServers(next);
              break;
            }

            if (normalized === "remove") {
              const id = parts.join(" ").trim();
              if (!id) {
                throw new Error("Use `/mcp remove SERVER_ID`.");
              }
              const next = await updateSettings({
                mcp_http_servers: currentServers.filter(
                  (server) => server.id !== id,
                ),
              });
              assistantContent = formatMcpServers(next);
              break;
            }

            throw new Error(
              "Use `/mcp list`, `/mcp add exa`, `/mcp set Label | URL | optional Authorization`, `/mcp enable ID`, `/mcp disable ID`, or `/mcp remove ID`.",
            );
          }

          case "/extract": {
            const targetPath = strippedMessage.trim();
            if (!targetPath) {
              throw new Error("Use `/extract /absolute/path/to/file`.");
            }

            const result = await invoke<ExtractedContent>(
              "extract_file_content",
              {
                path: targetPath,
              },
            );
            assistantContent = formatExtractedContent(result);
            break;
          }

          case "/signin": {
            const [mode, ...scopeParts] = strippedMessage.trim().split(/\s+/);
            const normalized = (mode || "status").toLowerCase();

            if (normalized === "status") {
              const status = await invoke<GoogleAuthStatus>(
                "get_google_auth_status",
              );
              assistantContent = formatGoogleAuthStatus(status);
              break;
            }

            if (
              normalized === "google" ||
              normalized === "identity" ||
              normalized === "login"
            ) {
              const status = await invoke<GoogleAuthStatus>(
                "sign_in_with_google_bridge",
              );
              await refreshSettings();
              assistantContent = formatGoogleAuthStatus(status);
              break;
            }

            if (normalized === "workspace") {
              const aliases = scopeParts.map((part) => part.toLowerCase());
              const requestedScopes = new Set<string>([
                "openid",
                "email",
                "profile",
              ]);

              if (aliases.length === 0 || aliases.includes("gmail")) {
                requestedScopes.add(
                  "https://www.googleapis.com/auth/gmail.readonly",
                );
                requestedScopes.add(
                  "https://www.googleapis.com/auth/gmail.send",
                );
              }

              if (aliases.length === 0 || aliases.includes("drive")) {
                requestedScopes.add(
                  "https://www.googleapis.com/auth/drive.file",
                );
                requestedScopes.add(
                  "https://www.googleapis.com/auth/drive.metadata.readonly",
                );
              }

              const status = await invoke<GoogleAuthStatus>(
                "connect_google_workspace",
                {
                  scopes: Array.from(requestedScopes),
                },
              );
              await refreshSettings();
              assistantContent = formatGoogleAuthStatus(status);
              break;
            }

            if (
              normalized === "signout" ||
              normalized === "logout" ||
              normalized === "disconnect"
            ) {
              await invoke<boolean>("sign_out_google_bridge");
              await refreshSettings();
              assistantContent =
                "Signed out the shared Google identity and Workspace session from Nexus AI.";
              break;
            }

            throw new Error(
              "Use `/signin`, `/signin google`, `/signin workspace`, `/signin workspace gmail drive`, or `/signin signout`.",
            );
          }

          case "/gmail": {
            const trimmed = strippedMessage.trim();

            if (!trimmed || trimmed.toLowerCase() === "list") {
              const messages = await invoke<GmailListItem[]>(
                "gmail_list_messages",
                {
                  query: null,
                  maxResults: 8,
                },
              );
              assistantContent = formatGmailList(messages);
              break;
            }

            if (trimmed.toLowerCase().startsWith("read ")) {
              const messageId = trimmed.slice(5).trim();
              if (!messageId) {
                throw new Error("Use `/gmail read MESSAGE_ID`.");
              }
              const message = await invoke<GmailMessage>("gmail_get_message", {
                messageId,
              });
              assistantContent = formatGmailMessage(message);
              break;
            }

            if (trimmed.toLowerCase().startsWith("send ")) {
              const payload = trimmed
                .slice(5)
                .split("|")
                .map((part) => part.trim());
              if (payload.length < 3) {
                throw new Error(
                  "Use `/gmail send to@example.com | Subject | Body text`.",
                );
              }

              assistantContent = await invoke<string>("gmail_send_message", {
                to: payload[0],
                subject: payload[1],
                body: payload[2],
                threadId: payload[3] || null,
              });
              break;
            }

            const messages = await invoke<GmailListItem[]>(
              "gmail_list_messages",
              {
                query: trimmed,
                maxResults: 8,
              },
            );
            assistantContent = formatGmailList(messages);
            break;
          }

          case "/drive": {
            const trimmed = strippedMessage.trim();
            const files = await invoke<DriveFileItem[]>("drive_list_files", {
              query: trimmed || null,
              pageSize: 10,
            });
            assistantContent = formatDriveFiles(files);
            break;
          }

          case "/calendar": {
            const trimmed = strippedMessage.trim();
            if (!trimmed || trimmed.toLowerCase() === "list") {
              assistantContent = await invoke<string>("list_calendar_events", {
                daysAhead: 7,
                limit: 8,
              });
              break;
            }

            if (!trimmed.toLowerCase().startsWith("add ")) {
              throw new Error(
                "Use /calendar to list events, or `/calendar add Title | 2026-04-17T18:30:00+05:30 | 2026-04-17T19:00:00+05:30 | optional notes`.",
              );
            }

            const payload = trimmed
              .slice(4)
              .split("|")
              .map((part) => part.trim());
            if (payload.length < 3) {
              throw new Error(
                "Calendar creation needs `Title | start ISO | end ISO | optional notes`.",
              );
            }

            assistantContent = await invoke<string>("create_calendar_event", {
              title: payload[0],
              startIso: payload[1],
              endIso: payload[2],
              notes: payload[3] || null,
            });
            break;
          }

          case "/alarm": {
            const payload = strippedMessage
              .split("|")
              .map((part) => part.trim());
            if (payload.length < 2) {
              throw new Error(
                "Use `/alarm Title | 2026-04-17T19:00:00+05:30 | optional notes`.",
              );
            }

            assistantContent = await invoke<string>("create_alarm_reminder", {
              title: payload[0],
              dueIso: payload[1],
              notes: payload[2] || null,
            });
            break;
          }
        }
      } catch (error) {
        assistantContent =
          error instanceof Error ? error.message : String(error);
        errorKind = "Other";
      }

      const wasCancelled = !nativeActionPendingRef.current;
      nativeActionPendingRef.current = false;
      nativeActionInputSnapshotRef.current = null;
      if (wasCancelled) return;

      setIsSubmitPending(false);
      setPendingUserMessage(null);
      appendLocalTurn(fullQuery, assistantContent, {
        quotedText: context,
        errorKind,
      });
    },
    [
      appendLocalTurn,
      refreshSettings,
      selectedContext,
      setSelectedContext,
      settings,
      updateSettings,
    ],
  );

  const handleSubmit = useCallback(() => {
    if (
      (query.trim().length === 0 && attachedImages.length === 0) ||
      isGenerating
    )
      return;

    // Clear any stale capture error from a previous attempt.
    setCaptureError(null);

    // Parse all valid commands from anywhere in the message.
    const trimmedQuery = query.trim();
    const { found, strippedMessage } = parseCommands(trimmedQuery);
    const hasScreen = found.has("/screen");
    const hasThink = found.has("/think");
    const explicitNativeCommand = firstNativeCommand(found);
    const inferredNativeAction =
      explicitNativeCommand === null ? inferNativeAction(trimmedQuery) : null;
    const nativeCommand =
      explicitNativeCommand ?? inferredNativeAction?.command ?? null;
    const nativeActionMessage =
      explicitNativeCommand !== null
        ? strippedMessage
        : inferredNativeAction?.strippedMessage ?? strippedMessage;

    if (nativeCommand && attachedImages.length > 0) {
      setCaptureError(
        "Native commands do not support attached images yet. Remove the images and try again.",
      );
      return;
    }

    // Nothing to send if the message is only commands with no content or images.
    if (
      !strippedMessage &&
      attachedImages.length === 0 &&
      !hasScreen &&
      nativeCommand !== "/touchid"
    ) {
      return;
    }

    if (hasScreen) {
      // Fire-and-forget: the async path handles cleanup and ask() invocation.
      void handleScreenSubmit(trimmedQuery, hasThink);
      return;
    }

    if (nativeCommand) {
      void handleNativeActionSubmit(
        trimmedQuery,
        nativeActionMessage,
        nativeCommand,
      );
      return;
    }

    // Sanitize externally-sourced context: strip control characters and enforce
    // a length cap to limit prompt-injection surface from host-app selections.
    // eslint-disable-next-line no-control-regex
    const CONTROL_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f]/g;
    const sanitized = selectedContext
      ?.replace(CONTROL_CHARS, "")
      .slice(0, quote.maxContextLength);
    const context = sanitized?.trim() ? sanitized : undefined;

    // If all images are ready (or there are none), submit immediately.
    const hasPendingImages = attachedImages.some(
      (img) => img.filePath === null,
    );
    if (!hasPendingImages) {
      const isVisionCapable = (provider: string, model: string) => {
        const p = provider.toLowerCase();
        const m = model.toLowerCase();
        if (p === \"ollama\") return true; // Assume ollama handles it or fails gracefully
        if (p === \"openai\") return m.includes(\"gpt-4\") || m.includes(\"gpt-5\") || m.includes(\"o1\");
        if (p === \"google\") return m.includes(\"gemini\");
        if (p === \"anthropic\") return m.includes(\"claude-3\");
        return false;
      };

      if (
        attachedImages.length > 0 &&
        !isVisionCapable(settings?.ai_provider || \"ollama\", settings?.ai_model || \"\")
      ) {
        const provider = settings?.ai_provider || \"ollama\";
        const visionModels: Record<string, string> = {
          openai: \"gpt-4o\",
          google: \"gemini-1.5-flash\",
          anthropic: \"claude-3-5-sonnet-latest\",
        };
        const targetModel = visionModels[provider.toLowerCase()];
        if (targetModel) {
          void updateSettings({ ai_model: targetModel }).then(() => {
            executeSubmit(trimmedQuery, context, hasThink || undefined);
          });
          return;
        }
      }

      executeSubmit(trimmedQuery, context, hasThink || undefined);
      return;
    }

    // Images are still processing — store the intent and wait. The effect
    // below will fire the actual ask() once every image has resolved.
    pendingSubmitRef.current = {
      query: trimmedQuery,
      context,
      think: hasThink,
    };
    setIsSubmitPending(true);

    // Show the user's message immediately in the chat view. Use file paths
    // for already-processed images (no loading spinner) and blob URLs only
    // for images still being processed (ChatBubble shows a spinner for blob: URLs).
    setPendingUserMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuery,
      quotedText: context,
      imagePaths: attachedImages.map((img) => img.filePath ?? img.blobUrl),
    });

    setQuery("");
    setSelectedContext(null);
    inputRef.current!.style.height = "auto";
  }, [
    query,
    isGenerating,
    executeSubmit,
    handleNativeActionSubmit,
    handleScreenSubmit,
    selectedContext,
    setSelectedContext,
    attachedImages,
    setCaptureError,
  ]);

  // When a pending submit exists and all images finish processing, fire it.
  // Reads `attachedImages` directly (not via `executeSubmit` closure) to
  // guarantee the effect always sees the freshest file paths.
  /* eslint-disable @eslint-react/set-state-in-effect -- intentional: effect
     reacts to image processing completion and must synchronously transition
     state (pending → submitted) in the same tick to avoid stale renders. */
  useEffect(() => {
    if (!pendingSubmitRef.current) return;
    if (attachedImages.length === 0) {
      // All images failed — restore the user's query so their text isn't lost.
      const { query: savedQuery, context: savedContext } =
        pendingSubmitRef.current;
      pendingSubmitRef.current = null;
      setIsSubmitPending(false);
      setPendingUserMessage(null);
      setQuery(savedQuery);
      setSelectedContext(savedContext ?? null);
      return;
    }
    // Wait until every image has finished backend processing.
    const allReady = attachedImages.every((img) => img.filePath !== null);
    if (!allReady) return;

    const { query: pendingQuery, context, think } = pendingSubmitRef.current;
    pendingSubmitRef.current = null;
    setIsSubmitPending(false);
    // Clear the preview message — ask() will add the real one with file paths.
    setPendingUserMessage(null);

    const images = attachedImages.map((img) => img.filePath as string);
    void ask(pendingQuery, context, images, think || undefined);
    // Note: the display content in the pending bubble (set in handleSubmit)
    // already includes command triggers for visibility in the chat.
    setSelectedContext(null);
    for (const img of attachedImages) {
      URL.revokeObjectURL(img.blobUrl);
    }
    setAttachedImages([]);
  }, [attachedImages, ask, setSelectedContext]);
  /* eslint-enable @eslint-react/set-state-in-effect */

  /**
   * Unified cancel handler: reverts a pending submit (undo-send), clears an
   * in-flight /screen capture, or cancels an active Ollama generation.
   *
   * Three cases:
   * 1. Image-processing pending (`pendingSubmitRef.current` is set): restore
   *    query and attached images so the user can re-submit or edit.
   * 2. Screen-capture in-flight (`isSubmitPending` true but ref is null):
   *    clear pending state. The async capture may still complete on the Rust
   *    side, but `isSubmitPending` being false when the result arrives will
   *    cause `handleScreenSubmit` to attempt ask() on stale state. To prevent
   *    that, we track the abandonment via a flag so the async tail is a no-op.
   * 3. Ollama generation active: delegate to the streaming cancel.
   */
  const handleCancel = useCallback(() => {
    if (isSubmitPending && pendingSubmitRef.current) {
      // Case 1: image-processing pending. Restore input state.
      setQuery(pendingSubmitRef.current.query);
      setSelectedContext(pendingSubmitRef.current.context ?? null);
      pendingSubmitRef.current = null;
      setIsSubmitPending(false);
      setPendingUserMessage(null);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (isSubmitPending) {
      if (nativeActionPendingRef.current) {
        nativeActionPendingRef.current = false;
        const snapshot = nativeActionInputSnapshotRef.current;
        nativeActionInputSnapshotRef.current = null;
        setIsSubmitPending(false);
        setPendingUserMessage(null);
        if (snapshot) {
          setQuery(snapshot.query);
          setSelectedContext(snapshot.context ?? null);
        }
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }

      // Case 2: /screen capture in flight. Signal cancellation via ref so the
      // async tail in handleScreenSubmit skips ask() when capture resolves.
      // Restore the ask bar to what it looked like before the capture started.
      screenCapturePendingRef.current = false;
      const snapshot = screenCaptureInputSnapshotRef.current;
      screenCaptureInputSnapshotRef.current = null;
      setIsSubmitPending(false);
      setPendingUserMessage(null);
      /* v8 ignore start -- snapshot is always set when isSubmitPending is true via /screen */
      if (snapshot) {
        setQuery(snapshot.query);
        setSelectedContext(snapshot.context ?? null);
      }
      /* v8 ignore stop */
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    cancel();
  }, [isSubmitPending, cancel, setSelectedContext]);

  /** Fetches model configuration from the backend once at mount. */
  useEffect(() => {
    void invoke<{ active: string; all: string[] }>("get_model_config").then(
      setModelConfig,
    );
  }, []);

  /**
   * Synchronizes the React animation state with Tauri-driven overlay visibility
   * requests emitted from the Rust backend.
   */
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    let unlistenVisibility: (() => void) | undefined;
    let unlistenOnboarding: (() => void) | undefined;
    let unlistenSettings: (() => void) | undefined;
    let unlistenHelp: (() => void) | undefined;
    let unlistenThemeChanged: (() => void) | undefined;
    let unlistenSiriPending: (() => void) | undefined;

    const attachListeners = async () => {
      try {
        void invoke("log_to_terminal", { msg: "Starting listener attachment" });
        unlistenVisibility = await listen<OverlayVisibilityPayload>(
          OVERLAY_VISIBILITY_EVENT,
          ({ payload }) => {
            if (payload.state === "show") {
              replayEntranceAnimation(
                payload.selected_text ?? null,
                payload.window_x ?? null,
                payload.window_y ?? null,
                payload.screen_bottom_y ?? null,
              );
            } else if (payload.state === "hide-request") {
              setIsSettingsOpen(false);
              setIsHelpOpen(false);
              requestHideOverlay();
            }
          },
        );

        void invoke("log_to_terminal", { msg: "Visibility listener attached" });

        const results = await Promise.all([
          listen<string | { stage: OnboardingStage }>(
            ONBOARDING_EVENT,
            ({ payload }) => {
              const stage =
                typeof payload === "string" ? payload : payload.stage;
              setOnboardingStage(stage as OnboardingStage);
            },
          ),
          listen("open-settings", () => setIsSettingsOpen(true)),
          listen("open-help", () => setIsHelpOpen(true)),
          listen<string>(THEME_CHANGE_EVENT, ({ payload }) => {
            applyThemeToDocument(payload);
            void refreshSettings().catch(() => undefined);
          }),
          listen(SIRI_PENDING_EVENT, () => {
            void drainPendingSiriRequests().catch(() => undefined);
          }),
        ]);

        unlistenOnboarding = results[0];
        unlistenSettings = results[1];
        unlistenHelp = results[2];
        unlistenThemeChanged = results[3];
        unlistenSiriPending = results[4];

        void invoke("log_to_terminal", {
          msg: "All listeners attached, notifying ready",
        });

        await invoke("notify_frontend_ready").catch((err) => {
          console.error("Failed to notify readiness:", err);
          void invoke("log_to_terminal", {
            msg: `Notify ready failed: ${String(err)}`,
          });
        });

        void invoke("log_to_terminal", {
          msg: "Frontend ready notification sent",
        });

        void refreshSettings().catch(() => undefined);
        void drainPendingSiriRequests().catch(() => undefined);

        // If onboarding is needed, we return the OnboardingView here.
        // We do it AFTER the handshake so the backend knows the frontend is ready
        // to receive the onboarding event and resize signals.
        if (onboardingStage) {
          return;
        }
      } catch (error) {
        console.error("Setup error:", error);
        void invoke("log_to_terminal", {
          msg: `Setup error: ${String(error)}`,
        });
        void invoke("notify_frontend_ready").catch(() => undefined);
        setOverlayState("visible"); // Last resort
      }
    };

    void attachListeners();
    return () => {
      unlistenVisibility?.();
      unlistenOnboarding?.();
      unlistenSettings?.();
      unlistenHelp?.();
      unlistenThemeChanged?.();
      unlistenSiriPending?.();
    };
  }, []);

  /**
   * Combined close handler shared by the keyboard shortcut (Esc/Cmd+W)
   * and the traffic light close/minimize buttons. Notifies the Rust
   * backend and triggers the frontend exit animation sequence.
   */
  const handleCloseOverlay = useCallback(() => {
    setIsSettingsOpen(false);
    setIsHelpOpen(false);
    void invoke("notify_overlay_hidden");
    requestHideOverlay();
  }, [requestHideOverlay]);

  /** Hide window on Escape or Cmd+W (macOS) / Ctrl+W. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (((e.metaKey || e.ctrlKey) && e.key === "w") || e.key === "Escape") {
        e.preventDefault();
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isHelpOpen) {
          setIsHelpOpen(false);
        } else {
          handleCloseOverlay();
        }
      }
      if (e.metaKey && e.key === ",") {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      if (e.metaKey && e.key === "?") {
        e.preventDefault();
        setIsHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCloseOverlay, isSettingsOpen, isHelpOpen]);

  /** Programmatic focus when the overlay becomes visible. */
  useEffect(() => {
    if (overlayState === "visible") {
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [overlayState]);

  /**
   * Commits the native window hide after a fixed deadline from the start of
   * the exit transition.
   */
  useEffect(() => {
    if (overlayState !== "hiding") return;

    const timer = setTimeout(() => {
      void getCurrentWindow().hide();
      void invoke("notify_overlay_hidden");
      setOverlayState("hidden");
    }, HIDE_COMMIT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [overlayState]);

  /**
   * Handles mousedown on any surface of the application window.
   *
   * For non-interactive targets (transparent padding, container chrome, etc.):
   * - Calls `preventDefault()` to suppress the browser's default behaviour of
   *   blurring the active element, keeping textarea focus intact.
   * - Initiates a native platform drag via `startDragging()`.
   *
   * For interactive targets (textarea, buttons, links): returns early so
   * standard DOM behaviour (focus, click, selection) proceeds normally.
   */
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    const el = e.target as HTMLElement | null;

    // Modal panels and other explicit opt-out regions should never initiate
    // window dragging, even when the click lands on non-form chrome.
    if (el?.closest("[data-no-window-drag]")) {
      return;
    }

    // 1. Allow native text selection in explicitly selectable regions.
    // If the click occurs inside a chat bubble (which has .select-text),
    // we return early so the user can highlight and copy the text.
    if (el?.closest(".select-text")) {
      return;
    }

    // 2. Allow interaction with standard interactive elements.
    const INTERACTIVE_TAGS = new Set([
      "TEXTAREA",
      "INPUT",
      "BUTTON",
      "A",
      "SELECT",
      "PATH",
      "SVG",
    ]);
    let current = el;
    while (current) {
      if (INTERACTIVE_TAGS.has(current.tagName.toUpperCase())) return;
      current = current.parentElement;
    }

    // Suppress the default mousedown side-effect (focus transfer / blur)
    // so the textarea retains keyboard input during window repositioning.
    e.preventDefault();
    void getCurrentWindow().startDragging();

    // After the user repositions the window, drop the upward-grow mode so
    // subsequent conversation growth tracks the new position downward.
    window.addEventListener(
      "mouseup",
      () => {
        growsUpwardRef.current = false;
        setGrowsUpward(false);
      },
      { once: true },
    );
  }, []);

  return (
    <div
      onMouseDown={handleDragStart}
      className={`overlay-shell flex flex-col items-center ${growsUpward ? "justify-end" : "justify-start"} h-screen w-screen px-3 pt-3 pb-7 bg-transparent overflow-visible`}
    >
      <AnimatePresence mode="wait">
        {onboardingStage ? (
          <div ref={setContainerRef}>
            <OnboardingView
              stage={onboardingStage}
              onComplete={() => setOnboardingStage(null)}
            />
          </div>
        ) : shouldRenderOverlay ? (
          <motion.div
            key={`overlay-${sessionId}`}
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="w-full max-w-3xl px-4 py-2 overflow-visible"
          >
            {/* Relative wrapper — serves as the positioning context for the
                chat-mode history dropdown so it can sit outside the morphing
                container's overflow-hidden boundary without being clipped. */}
            <div className="overlay-frame relative">
              {/* Morphing Container — flex column ensures the input bar
                  always sticks to the bottom without spring animation lag.
                  A CSS `transition: min-height` drives smooth window growth
                  when the chat-mode history dropdown is open; the existing
                  ResizeObserver fires per-frame and calls setSize() so the
                  native window tracks the animation. The dropdown is a sibling
                  (not a child) so overflow-hidden never clips it. */}
              <div
                ref={setContainerRef}
                style={{
                  maxHeight: `${MAX_CHAT_CONTAINER_HEIGHT}px`,
                  transition:
                    "height 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                className={`morphing-container relative z-10 flex flex-col bg-surface-base backdrop-blur-3xl border border-surface-border overflow-hidden ${
                  isChatMode
                    ? `rounded-[26px] shadow-chat`
                    : "rounded-[28px] shadow-bar"
                }`}
              >
                {/* Chat Messages Area — morphs in when in chat mode */}
                <AnimatePresence>
                  {isChatMode ? (
                    <ConversationView
                      messages={
                        pendingUserMessage
                          ? [...messages, pendingUserMessage]
                          : messages
                      }
                      isGenerating={isGenerating || isSubmitPending}
                      onClose={handleCloseOverlay}
                      onSave={handleSave}
                      isSaved={isSaved}
                      canSave={canSave}
                      onNewConversation={handleNewConversation}
                      onHistoryOpen={handleHistoryToggle}
                      onImagePreview={handleChatImagePreview}
                    />
                  ) : null}
                </AnimatePresence>

                {/* Ask-bar mode history panel — inline below the input bar.
                    The !isChatMode gate lives OUTSIDE AnimatePresence so that when
                    a conversation is loaded (isChatMode → true) the panel unmounts
                    instantly — no exit animation runs alongside ConversationView
                    mounting. Without this, AnimatePresence would hold the panel in
                    the DOM during its exit while ConversationView is also present,
                    causing two rapid ResizeObserver → setSize() calls (jitter).
                    AnimatePresence is still used for the manual toggle (isHistoryOpen)
                    so the drawer height-animates smoothly open and closed. */}
                {!isChatMode && (
                  <AnimatePresence>
                    {isHistoryOpen ? (
                      <motion.div
                        key="ask-bar-history"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: {
                            duration: 0.3,
                            ease: [0.33, 1, 0.68, 1],
                          },
                          opacity: { duration: 0.2, delay: 0.08 },
                        }}
                        style={{ overflow: "hidden" }}
                        className="border-t border-surface-border"
                      >
                        <HistoryPanel
                          listConversations={listConversations}
                          onLoadConversation={handleLoadConversation}
                          onSaveAndLoad={handleSaveAndLoad}
                          onDeleteConversation={handleDeleteConversation}
                          hasCurrentMessages={false}
                          showNewConversation={false}
                          currentConversationId={conversationId}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                )}

                {/* Capture error banner: shown when /screen capture fails so
                    the user knows why the message was not sent. */}
                {captureError && (
                  <div className="px-4 py-2 border-t border-red-900/30">
                    <p className="text-red-400 text-xs leading-relaxed">
                      {captureError}
                    </p>
                  </div>
                )}

                {/* Input Bar — always pinned to the bottom */}
                <AskBarView
                  query={query}
                  setQuery={setQuery}
                  isChatMode={isChatMode}
                  isGenerating={isGenerating}
                  isSubmitPending={isSubmitPending}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  inputRef={inputRef}
                  selectedText={selectedContext ?? undefined}
                  onHistoryOpen={handleHistoryToggle}
                  attachedImages={isSubmitPending ? [] : attachedImages}
                  onImagesAttached={handleImagesAttached}
                  onImageRemove={handleImageRemove}
                  onImagePreview={handleAskBarImagePreview}
                  onScreenshot={handleScreenshot}
                  onSettingsOpen={() => setIsSettingsOpen(true)}
                  onHelpOpen={() => setIsHelpOpen(true)}
                />
              </div>

              {/* Chat-mode history dropdown — sibling of the morphing container so
                  it is never clipped by its overflow-hidden. Positioned absolutely
                  within this relative wrapper (same coordinate space as the
                  container). The container's minHeight animation grows the native
                  window tall enough to reveal the full dropdown. */}
              <AnimatePresence>
                {isChatMode && isHistoryOpen ? (
                  <motion.div
                    ref={historyDropdownRef}
                    key="chat-history"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="history-dropdown absolute right-3 top-12 z-50 w-60 rounded-2xl border border-surface-border bg-surface-elevated backdrop-blur-3xl shadow-chat overflow-hidden flex flex-col"
                  >
                    <HistoryPanel
                      listConversations={listConversations}
                      onLoadConversation={handleLoadConversation}
                      onSaveAndLoad={handleSaveAndLoad}
                      onDeleteConversation={handleDeleteConversation}
                      hasCurrentMessages={messages.length > 0 && !isSaved}
                      currentConversationId={conversationId}
                      showNewConversation={false}
                      pendingNewConversation={pendingNewConversation}
                      onSaveAndNew={handleSaveAndNew}
                      onJustNew={handleJustNew}
                      onCancelNew={() => setIsHistoryOpen(false)}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <ImagePreviewModal
        imageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        panelRef={setShellModalNode}
        settings={settings ?? {}}
        onUpdateSettings={async (patch) => {
          await updateSettings(patch);
        }}
      />

      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        panelRef={setShellModalNode}
      />
    </div>
  );
}

export default App;
