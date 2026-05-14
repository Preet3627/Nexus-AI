import { invoke } from "@tauri-apps/api/core";
import { tool } from "ai";
import { z } from "zod";
import type { AppSettings } from "../../types/settings";

interface ShellCommandResult {
  command: string;
  stdout: string;
  stderr: string;
  exit_code: number | null;
  succeeded: boolean;
}

function formatShellResult(result: ShellCommandResult): string {
  const sections = [
    `Shell command finished with exit code ${result.exit_code ?? "unknown"}.`,
  ];

  if (result.stdout.trim()) {
    sections.push(`stdout:\n${result.stdout.trim()}`);
  }

  if (result.stderr.trim()) {
    sections.push(`stderr:\n${result.stderr.trim()}`);
  }

  if (!result.stdout.trim() && !result.stderr.trim()) {
    sections.push("The command completed without producing output.");
  }

  return sections.join("\n\n");
}

function formatJsonResult(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function createDesktopTools(settings?: AppSettings | null) {
  return {
    searchWeb: tool({
      description: "Search the web in the user's default browser.",
      inputSchema: z.object({
        query: z.string().min(1),
      }),
      execute: async ({ query }) => invoke<string>("search_web", { query }),
    }),
    openTarget: tool({
      description: "Open a URL, file, folder, or native macOS app.",
      inputSchema: z.object({
        target: z.string().min(1),
      }),
      execute: async ({ target }) => invoke<string>("open_target", { target }),
    }),
    playSong: tool({
      description:
        "Play a song using the user's preferred provider. YouTube uses Comet-AI automation when available.",
      inputSchema: z.object({
        query: z.string().min(1),
        provider: z.enum(["youtube", "spotify", "apple-music"]).optional(),
      }),
      execute: async ({ query, provider }) =>
        invoke<string>("play_song", {
          query,
          provider: provider ?? null,
        }),
    }),
    runShellCommand: tool({
      description:
        "Run a local shell command when the user explicitly asks for a shell-level action.",
      inputSchema: z.object({
        command: z.string().min(1),
      }),
      execute: async ({ command }) => {
        const result = await invoke<ShellCommandResult>("run_shell_command", {
          command,
        });
        return formatShellResult(result);
      },
    }),
    setOutputVolume: tool({
      description: "Set the macOS output volume from 0 to 100.",
      inputSchema: z.object({
        level: z.number().min(0).max(100),
      }),
      execute: async ({ level }) =>
        invoke<string>("set_output_volume", { level: Math.round(level) }),
    }),
    launchComet: tool({
      description:
        "Launch Comet-AI, connect to its local control bridge, and optionally open a URL for the task.",
      inputSchema: z.object({
        url: z.string().url().optional(),
      }),
      execute: async ({ url }) =>
        invoke<string>("comet_launch_and_connect", {
          options: {
            target: settings?.comet_app_target ?? null,
            host: settings?.comet_host ?? "localhost",
            port: settings?.comet_port ?? 9922,
            url: url ?? null,
          },
        }),
    }),
    listCalendarEvents: tool({
      description: "Read the user's upcoming Calendar events on macOS.",
      inputSchema: z.object({
        daysAhead: z.number().min(1).max(30).optional(),
        limit: z.number().min(1).max(20).optional(),
      }),
      execute: async ({ daysAhead, limit }) =>
        invoke<string>("list_calendar_events", {
          daysAhead: daysAhead ? Math.round(daysAhead) : null,
          limit: limit ? Math.round(limit) : null,
        }),
    }),
    createCalendarEvent: tool({
      description:
        "Create a native macOS Calendar event. Use RFC3339 timestamps, for example 2026-04-17T18:30:00+05:30.",
      inputSchema: z.object({
        title: z.string().min(1),
        startIso: z.string().min(1),
        endIso: z.string().min(1),
        notes: z.string().optional(),
      }),
      execute: async ({ title, startIso, endIso, notes }) =>
        invoke<string>("create_calendar_event", {
          title,
          startIso,
          endIso,
          notes: notes ?? null,
        }),
    }),
    createAlarmReminder: tool({
      description:
        "Create a Reminders alarm on macOS. Use an RFC3339 due timestamp, for example 2026-04-17T19:00:00+05:30.",
      inputSchema: z.object({
        title: z.string().min(1),
        dueIso: z.string().min(1),
        notes: z.string().optional(),
      }),
      execute: async ({ title, dueIso, notes }) =>
        invoke<string>("create_alarm_reminder", {
          title,
          dueIso,
          notes: notes ?? null,
        }),
    }),
    getGoogleAuthStatus: tool({
      description:
        "Check whether Google identity and Google Workspace are connected in Nexus AI.",
      inputSchema: z.object({}),
      execute: async () =>
        formatJsonResult(await invoke("get_google_auth_status")),
    }),
    signInWithGoogle: tool({
      description:
        "Start the Google sign-in flow in the browser and connect the Nexus AI identity session.",
      inputSchema: z.object({}),
      execute: async () =>
        formatJsonResult(await invoke("sign_in_with_google_bridge")),
    }),
    connectGoogleWorkspace: tool({
      description:
        "Connect Gmail and Google Drive access through the hosted Google auth bridge.",
      inputSchema: z.object({
        scopes: z.array(z.string().min(1)).optional(),
      }),
      execute: async ({ scopes }) =>
        formatJsonResult(
          await invoke("connect_google_workspace", {
            scopes: scopes?.length ? scopes : null,
          }),
        ),
    }),
    signOutGoogle: tool({
      description:
        "Remove the shared Google identity and Google Workspace sessions from Nexus AI.",
      inputSchema: z.object({}),
      execute: async () =>
        formatJsonResult(await invoke("sign_out_google_bridge")),
    }),
    listGmailMessages: tool({
      description: "List recent Gmail messages or search the mailbox.",
      inputSchema: z.object({
        query: z.string().optional(),
        maxResults: z.number().min(1).max(25).optional(),
      }),
      execute: async ({ query, maxResults }) =>
        formatJsonResult(
          await invoke("gmail_list_messages", {
            query: query?.trim() ? query.trim() : null,
            maxResults: maxResults ? Math.round(maxResults) : null,
          }),
        ),
    }),
    getGmailMessage: tool({
      description: "Read a specific Gmail message by its Gmail message id.",
      inputSchema: z.object({
        messageId: z.string().min(1),
      }),
      execute: async ({ messageId }) =>
        formatJsonResult(
          await invoke("gmail_get_message", { messageId: messageId.trim() }),
        ),
    }),
    sendGmailMessage: tool({
      description: "Send an email through the connected Gmail account.",
      inputSchema: z.object({
        to: z.string().min(1),
        subject: z.string().min(1),
        body: z.string().min(1),
        threadId: z.string().optional(),
      }),
      execute: async ({ to, subject, body, threadId }) =>
        invoke<string>("gmail_send_message", {
          to: to.trim(),
          subject: subject.trim(),
          body,
          threadId: threadId?.trim() ? threadId.trim() : null,
        }),
    }),
    listDriveFiles: tool({
      description:
        "List Google Drive files available to the connected account.",
      inputSchema: z.object({
        query: z.string().optional(),
        pageSize: z.number().min(1).max(50).optional(),
      }),
      execute: async ({ query, pageSize }) =>
        formatJsonResult(
          await invoke("drive_list_files", {
            query: query?.trim() ? query.trim() : null,
            pageSize: pageSize ? Math.round(pageSize) : null,
          }),
        ),
    }),
    searchGitHubRepositories: tool({
      description:
        "Search GitHub repositories. Use this for finding projects, libraries, or repos that match a topic.",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(10).optional(),
      }),
      execute: async ({ query, limit }) =>
        formatJsonResult(
          await invoke("github_search_repositories", {
            query,
            limit: limit ? Math.round(limit) : null,
          }),
        ),
    }),
    searchGitHubIssues: tool({
      description:
        "Search GitHub issues and pull requests across repositories using GitHub search syntax.",
      inputSchema: z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(10).optional(),
      }),
      execute: async ({ query, limit }) =>
        formatJsonResult(
          await invoke("github_search_issues", {
            query,
            limit: limit ? Math.round(limit) : null,
          }),
        ),
    }),
    listGitHubPullRequests: tool({
      description: "List pull requests for a specific GitHub repository.",
      inputSchema: z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        state: z.string().optional(),
        limit: z.number().min(1).max(20).optional(),
      }),
      execute: async ({ owner, repo, state, limit }) =>
        formatJsonResult(
          await invoke("github_list_pull_requests", {
            owner,
            repo,
            state: state?.trim() ? state.trim() : null,
            limit: limit ? Math.round(limit) : null,
          }),
        ),
    }),
    getGitHubFileContents: tool({
      description:
        "Read a text file from GitHub by owner, repo, and path. Use this when a task references repository source directly.",
      inputSchema: z.object({
        owner: z.string().min(1),
        repo: z.string().min(1),
        path: z.string().min(1),
        reference: z.string().optional(),
      }),
      execute: async ({ owner, repo, path, reference }) =>
        formatJsonResult(
          await invoke("github_get_file_contents", {
            owner,
            repo,
            path,
            reference: reference?.trim() ? reference.trim() : null,
          }),
        ),
    }),
    extractLocalFile: tool({
      description:
        "Extract readable text from a local file, including PDF, images via OCR, Office files, and spreadsheets.",
      inputSchema: z.object({
        path: z.string().min(1),
      }),
      execute: async ({ path }) =>
        formatJsonResult(await invoke("extract_file_content", { path })),
    }),
  };
}
