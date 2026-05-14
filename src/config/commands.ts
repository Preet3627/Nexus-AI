/**
 * Registry of all slash commands supported by the ask bar.
 *
 * Each entry drives both the CommandSuggestion autocomplete UI and the
 * submit-time parser in App.tsx. Adding a command here is sufficient:
 * no other registration is needed.
 */

export interface Command {
  /** The slash trigger, e.g. "/screen". Must start with "/". */
  readonly trigger: string;
  /** Short label shown in the suggestion row. */
  readonly label: string;
  /** One-line description shown as muted subtext in the suggestion row. */
  readonly description: string;
}

export const COMMANDS: readonly Command[] = [
  {
    trigger: "/screen",
    label: "/screen",
    description: "Capture your screen and include it as context",
  },
  {
    trigger: "/web",
    label: "/web",
    description: "Search the web in your default browser",
  },
  {
    trigger: "/open",
    label: "/open",
    description: "Open an app, file, folder, or URL with macOS",
  },
  {
    trigger: "/play",
    label: "/play",
    description: "Play a song with your preferred music provider",
  },
  {
    trigger: "/shell",
    label: "/shell",
    description: "Run a shell command locally and show the result",
  },
  {
    trigger: "/volume",
    label: "/volume",
    description: "Set the macOS output volume from 0 to 100",
  },
  {
    trigger: "/menuicon",
    label: "/menuicon",
    description: "Hide or show the menu bar icon like Raycast",
  },
  {
    trigger: "/touchid",
    label: "/touchid",
    description: "Verify your identity with Touch ID",
  },
  {
    trigger: "/provider",
    label: "/provider",
    description: "Switch between Ollama and Vercel AI providers",
  },
  {
    trigger: "/apikey",
    label: "/apikey",
    description: "Store an API key for OpenAI, Google, Anthropic, or xAI",
  },
  {
    trigger: "/comet",
    label: "/comet",
    description: "Launch and connect to Comet-AI for browser tasks",
  },
  {
    trigger: "/github",
    label: "/github",
    description: "Search GitHub or read repository files",
  },
  {
    trigger: "/mcp",
    label: "/mcp",
    description: "Manage remote HTTP MCP servers for OpenAI tool calling",
  },
  {
    trigger: "/extract",
    label: "/extract",
    description:
      "Extract readable text from local PDF, image, Office, or spreadsheet files",
  },
  {
    trigger: "/signin",
    label: "/signin",
    description: "Connect or disconnect the shared Google account bridge",
  },
  {
    trigger: "/gmail",
    label: "/gmail",
    description: "Read or send Gmail with the connected Google account",
  },
  {
    trigger: "/drive",
    label: "/drive",
    description: "List Google Drive files from the connected account",
  },
  {
    trigger: "/calendar",
    label: "/calendar",
    description: "List upcoming Calendar events or create one",
  },
  {
    trigger: "/alarm",
    label: "/alarm",
    description: "Create a reminder alarm on macOS",
  },
  {
    trigger: "/think",
    label: "/think",
    description: "Think deeply before answering",
  },
  {
    trigger: "/autolaunch",
    label: "/autolaunch",
    description: "Enable or disable launch at login",
  },
] as const;

/**
 * Sentinel image-path value used as a loading placeholder while the
 * /screen capture is in flight. ChatBubble detects this value and
 * renders a branded screen-capture loading tile instead of a broken image.
 */
export const SCREEN_CAPTURE_PLACEHOLDER = "blob:screen-capture-loading";
