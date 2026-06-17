import { useEffect, useState, type Ref } from "react";
import { motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import type { AppSettings } from "../types/settings";
import {
  fetchOpenAIModels,
  fetchGoogleModels,
  fetchAnthropicModels,
  fetchXaiModels,
  fetchGroqModels,
} from "../services/ai/provider";

interface GoogleAuthStatus {
  identity_connected: boolean;
  workspace_connected: boolean;
  email?: string;
  workspace_scopes: string[];
}

type CloudKeyField =
  | "openai_api_key"
  | "google_api_key"
  | "anthropic_api_key"
  | "xai_api_key"
  | "groq_api_key";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  panelRef?: Ref<HTMLDivElement>;
  settings: Partial<AppSettings>;
  onUpdateSettings: (patch: Record<string, unknown>) => Promise<void>;
}

interface ProviderConfig {
  id: string;
  name: string;
  defaultModel: string;
  models: string[];
  description: string;
  setup: string[];
  keyField?: CloudKeyField;
  keyPlaceholder?: string;
  keyUrl?: string;
  docsUrl?: string;
}

interface ThemeOption {
  id: string;
  name: string;
  preview: string;
}

interface MusicProviderOption {
  id: string;
  name: string;
  description: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: "ollama",
    name: "Ollama",
    defaultModel: "llama3.2",
    models: [],
    description: "Runs local models on your Mac. No API key required.",
    setup: [
      "Install Ollama on this Mac.",
      "Run `ollama pull llama3.2` or another model.",
      "Keep Ollama running while Nexus AI is open.",
    ],
    docsUrl: "https://ollama.com/download",
  },
  {
    id: "vercel-openai",
    name: "OpenAI",
    defaultModel: "gpt-5-mini",
    models: ["gpt-5-mini", "gpt-4o", "gpt-4o-mini", "o1-mini"],
    description: "Fast cloud models via your OpenAI API key.",
    setup: [
      "Create an API key in your OpenAI project.",
      "Paste the key here and save it.",
      "Pick the model you want Nexus AI to use.",
    ],
    keyField: "openai_api_key",
    keyPlaceholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    docsUrl: "https://platform.openai.com/docs/overview",
  },
  {
    id: "google",
    name: "Google",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-3.0-flash"],
    description: "Gemini models from Google AI Studio.",
    setup: [
      "Open Google AI Studio and create an API key.",
      "Paste the key here and save it.",
      "Use a server-side key, not a client-exposed one.",
    ],
    keyField: "google_api_key",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
    docsUrl: "https://ai.google.dev/tutorials/setup",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    defaultModel: "claude-3-7-sonnet-latest",
    models: [
      "claude-3-7-sonnet-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-opus-latest",
    ],
    description: "Claude models from the Anthropic Console.",
    setup: [
      "Create an API key in Anthropic Console.",
      "Paste the key here and save it.",
      "Use the docs link if you also need billing or workspace setup.",
    ],
    keyField: "anthropic_api_key",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
    docsUrl: "https://docs.anthropic.com/en/api/getting-started",
  },
  {
    id: "xai",
    name: "xAI",
    defaultModel: "grok-3-mini",
    models: ["grok-3-mini", "grok-3", "grok-2"],
    description: "Grok models using an xAI Console key.",
    setup: [
      "Create an API key in the xAI Console.",
      "Paste the key here and save it.",
      "Use the API guide if you need endpoint details.",
    ],
    keyField: "xai_api_key",
    keyPlaceholder: "xai-...",
    keyUrl: "https://console.x.ai",
    docsUrl: "https://x.ai/news/api/",
  },
  {
    id: "groq",
    name: "Groq",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
    description: "Fast open source models using Groq LPU inference.",
    setup: [
      "Create an API key in the Groq Console.",
      "Paste the key here and save it.",
      "Enjoy blazing fast generation.",
    ],
    keyField: "groq_api_key",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    docsUrl: "https://console.groq.com/docs/quickstart",
  },
];

const THEMES: ThemeOption[] = [
  {
    id: "dark",
    name: "Dark",
    preview: "from-[#111827] via-[#1f2937] to-[#f97316]",
  },
  {
    id: "light",
    name: "Light",
    preview: "from-[#fff7ed] via-[#f8fafc] to-[#93c5fd]",
  },
  {
    id: "graphite",
    name: "Graphite",
    preview: "from-[#0f172a] via-[#1e293b] to-[#64748b]",
  },
  {
    id: "aurora",
    name: "Aurora",
    preview: "from-[#052e2b] via-[#0f766e] to-[#93c5fd]",
  },
  {
    id: "dawn",
    name: "Dawn",
    preview: "from-[#fff1d6] via-[#ffd6c7] to-[#f59e0b]",
  },
];

const MUSIC_PROVIDERS: MusicProviderOption[] = [
  {
    id: "youtube",
    name: "YouTube",
    description:
      "Uses Comet-AI to open search results and auto-click the first video.",
  },
  {
    id: "spotify",
    name: "Spotify",
    description: "Opens Spotify search for the requested song.",
  },
  {
    id: "apple-music",
    name: "Apple Music",
    description: "Opens Apple Music search for the requested song.",
  },
];

function normalizeProviderId(value?: string | null): string {
  switch (value?.trim().toLowerCase()) {
    case "openai":
    case "vercel-openai":
      return "openai";
    case "google":
    case "gemini":
    case "vercel-google":
      return "google";
    case "anthropic":
    case "vercel-anthropic":
      return "anthropic";
    case "xai":
    case "grok":
    case "vercel-xai":
      return "xai";
    case "groq":
    case "vercel-groq":
      return "groq";
    default:
      return "ollama";
  }
}

export function SettingsPanel({
  isOpen,
  onClose,
  panelRef,
  settings,
  onUpdateSettings,
}: SettingsPanelProps) {
  const [authStatus, setAuthStatus] = useState<GoogleAuthStatus | null>(null);
  const [isLoadingIdentity, setIsLoadingIdentity] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [draftKeys, setDraftKeys] = useState<Record<CloudKeyField, string>>({
    openai_api_key: "",
    google_api_key: "",
    anthropic_api_key: "",
    xai_api_key: "",
    groq_api_key: "",
  });
  const [savingKeyField, setSavingKeyField] = useState<CloudKeyField | null>(
    null,
  );
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isLoadingOllamaModels, setIsLoadingOllamaModels] = useState(false);
  const [cloudModels, setCloudModels] = useState<Record<string, string[]>>({});
  const [isLoadingCloudModels, setIsLoadingCloudModels] = useState(false);

  const [memories, setMemories] = useState<{ id: string; content: string; created_at: number }[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState("");

  const currentProviderId = normalizeProviderId(settings.ai_provider);
  const activeProvider =
    PROVIDERS.find((provider) => provider.id === currentProviderId) ??
    PROVIDERS[0];
  const currentModel =
    settings.ai_model ||
    PROVIDERS.find((provider) => provider.id === currentProviderId)
      ?.defaultModel ||
    "llama3.2";
  const currentMusicProvider =
    MUSIC_PROVIDERS.find((provider) => provider.id === settings.music_provider)
      ?.id ?? "youtube";

  const isOllamaProvider = currentProviderId === "ollama";
  const isCloudProvider = ["openai", "google", "anthropic", "xai", "groq"].includes(currentProviderId);
  const displayModels = isOllamaProvider && ollamaModels.length > 0
    ? ollamaModels
    : isCloudProvider && cloudModels[currentProviderId]?.length > 0
      ? cloudModels[currentProviderId]
      : activeProvider.models.length > 0
        ? activeProvider.models
        : [activeProvider.defaultModel];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDraftKeys({
      openai_api_key: settings.openai_api_key ?? "",
      google_api_key: settings.google_api_key ?? "",
      anthropic_api_key: settings.anthropic_api_key ?? "",
      xai_api_key: settings.xai_api_key ?? "",
      groq_api_key: settings.groq_api_key ?? "",
    });
  }, [
    isOpen,
    settings.anthropic_api_key,
    settings.google_api_key,
    settings.openai_api_key,
    settings.xai_api_key,
    settings.groq_api_key,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void fetchAuthStatus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isOllamaProvider) {
      return;
    }
    void fetchOllamaModels();

    const onFocus = () => void fetchOllamaModels();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isOpen, isOllamaProvider]);

  useEffect(() => {
    if (!isOpen || !isCloudProvider) {
      return;
    }
    void fetchCloudModels();

    const onFocus = () => void fetchCloudModels();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isOpen, isCloudProvider]);

  const fetchOllamaModels = async () => {
    setIsLoadingOllamaModels(true);
    try {
      const models = await invoke<string[]>("list_ollama_models", {
        baseUrl: settings.ollama_base_url || null,
      });
      setOllamaModels(models);
      if (models.length > 0 && !settings.ai_model) {
        void onUpdateSettings({ ai_model: models[0] });
      }
    } catch {
      setOllamaModels([]);
    } finally {
      setIsLoadingOllamaModels(false);
    }
  };

  const fetchCloudModels = async () => {
    setIsLoadingCloudModels(true);
    const apiKeyMap: Record<string, string> = {
      openai: settings.openai_api_key ?? "",
      google: settings.google_api_key ?? "",
      anthropic: settings.anthropic_api_key ?? "",
      xai: settings.xai_api_key ?? "",
      groq: settings.groq_api_key ?? "",
    };
    const apiKey = apiKeyMap[currentProviderId];
    if (!apiKey) {
      setIsLoadingCloudModels(false);
      return;
    }
    try {
      let models: string[] = [];
      switch (currentProviderId) {
        case "openai":
          models = await fetchOpenAIModels(apiKey);
          break;
        case "google":
          models = await fetchGoogleModels(apiKey);
          break;
        case "anthropic":
          models = await fetchAnthropicModels(apiKey);
          break;
        case "xai":
          models = await fetchXaiModels(apiKey);
          break;
        case "groq":
          models = await fetchGroqModels(apiKey);
          break;
      }
      setCloudModels((prev) => ({ ...prev, [currentProviderId]: models }));
    } catch {
      setCloudModels((prev) => ({ ...prev, [currentProviderId]: [] }));
    } finally {
      setIsLoadingCloudModels(false);
    }
  };

  const fetchAuthStatus = async () => {
    try {
      const status = await invoke<GoogleAuthStatus>("get_google_auth_status");
      setAuthStatus(status);
    } catch {
      setAuthStatus(null);
    }
  };

  const handleSignInIdentity = async () => {
    setIsLoadingIdentity(true);
    try {
      await invoke("sign_in_with_google_bridge");
      await fetchAuthStatus();
    } catch (error) {
      console.error("Sign in failed:", error);
    } finally {
      setIsLoadingIdentity(false);
    }
  };

  const handleSignInWorkspace = async () => {
    setIsLoadingWorkspace(true);
    try {
      await invoke("connect_google_workspace", { scopes: null });
      await fetchAuthStatus();
    } catch (error) {
      console.error("Workspace sign in failed:", error);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await invoke("sign_out_google_bridge");
      setAuthStatus(null);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleProviderChange = async (providerId: string) => {
    const provider = PROVIDERS.find((item) => item.id === providerId);
    if (!provider) {
      return;
    }

    await onUpdateSettings({
      ai_provider: provider.id,
      ai_model: provider.defaultModel,
    });
  };

  const handleModelChange = async (model: string) => {
    await onUpdateSettings({ ai_model: model });
  };

  const handleMusicProviderChange = async (providerId: string) => {
    await onUpdateSettings({ music_provider: providerId });
  };

  const handleToggle = async (key: string, value: boolean) => {
    await onUpdateSettings({ [key]: value });
  };

  const handleSaveKey = async (provider: ProviderConfig) => {
    if (!provider.keyField) {
      return;
    }

    const nextValue = draftKeys[provider.keyField].trim();
    if (!nextValue) {
      return;
    }

    setSavingKeyField(provider.keyField);
    try {
      await onUpdateSettings({ [provider.keyField]: nextValue });
    } finally {
      setSavingKeyField(null);
    }
  };

  const fetchMemories = async () => {
    try {
      const items = await invoke<{ id: string; content: string; created_at: number }[]>("get_user_memories");
      setMemories(items);
    } catch (error) {
      console.error("Failed to load memories:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchMemories();
    }
  }, [isOpen]);

  const handleDeleteMemory = async (id: string) => {
    try {
      await invoke("delete_user_memory", { id });
      void fetchMemories();
    } catch (error) {
      console.error("Failed to delete memory:", error);
    }
  };

  const handleStartEdit = (id: string, content: string) => {
    setEditingMemoryId(id);
    setEditingMemoryText(content);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await invoke("edit_user_memory", { id, content: editingMemoryText });
      setEditingMemoryId(null);
      setEditingMemoryText("");
      void fetchMemories();
    } catch (error) {
      console.error("Failed to save memory:", error);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      await invoke("add_user_memory", { content: newMemory });
      setNewMemory("");
      void fetchMemories();
    } catch (error) {
      console.error("Failed to add memory:", error);
    }
  };

  if (!isOpen) {
    return null;
  }

  const storedProviderKey = activeProvider.keyField
    ? (settings[activeProvider.keyField] ?? "")
    : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/58 px-4 py-6 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        ref={panelRef}
        initial={{ scale: 0.96, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 18 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        data-no-window-drag
        className="my-auto flex w-full max-w-[640px] flex-col overflow-hidden rounded-[30px] border border-white/12 bg-[linear-gradient(180deg,rgba(14,18,25,0.92),rgba(10,13,20,0.82))] shadow-[0_32px_120px_-42px_rgba(0,0,0,0.88)] backdrop-blur-2xl"
        style={{ maxHeight: "min(880px, calc(100vh - 3rem))" }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/10 bg-[linear-gradient(135deg,rgba(255,140,92,0.14),rgba(94,154,255,0.08))] px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ff995d,#ff6b5d)] shadow-[0_18px_40px_-22px_rgba(255,140,92,0.85)]">
                <svg
                  className="h-4.5 w-4.5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M2 12h3M19 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
                </svg>
              </div>
              <div>
                <h2 className="text-[1.85rem] font-semibold leading-none text-white">
                  Settings
                </h2>
                <p className="mt-2 text-sm text-white/55">
                  Provider, account, startup, and theme controls
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/6 text-white/70 transition-colors hover:bg-white/12 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/88">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                AI Provider
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id)}
                  className={`rounded-2xl border px-3 py-3 text-left text-sm transition-all ${
                    currentProviderId === provider.id
                      ? "border-white/22 bg-white/12 text-white shadow-[0_12px_30px_-20px_rgba(255,140,92,0.65)]"
                      : "border-transparent bg-white/5 text-white/62 hover:border-white/10 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <div className="font-semibold">{provider.name}</div>
                  <div className="mt-1 text-[11px] text-white/48">
                    {currentProviderId === provider.id && currentModel
                      ? currentModel
                      : provider.defaultModel}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between text-white/88">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                Model
              </span>
              {(isOllamaProvider || isCloudProvider) && (
                <button
                  onClick={() => {
                    if (isOllamaProvider) void fetchOllamaModels();
                    else void fetchCloudModels();
                  }}
                  disabled={isLoadingOllamaModels || isLoadingCloudModels}
                  className="flex items-center gap-1.5 rounded-lg bg-white/6 px-2.5 py-1 text-[11px] text-white/60 transition-colors hover:bg-white/12 hover:text-white disabled:opacity-40"
                >
                  <svg
                    className={`h-3 w-3 ${isLoadingOllamaModels || isLoadingCloudModels ? "animate-spin" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Refresh
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {isLoadingOllamaModels || isLoadingCloudModels ? (
                <div className="col-span-2 flex items-center justify-center rounded-2xl border border-white/8 bg-black/16 px-3 py-6">
                  <svg
                    className="h-5 w-5 animate-spin text-white/40"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span className="ml-2 text-sm text-white/40">
                    Loading models...
                  </span>
                </div>
              ) : isCloudProvider && !cloudModels[currentProviderId]?.length ? (
                <div className="col-span-2 rounded-2xl border border-white/8 bg-black/16 px-3 py-4 text-center text-sm text-white/50">
                  Add API key to load models
                </div>
              ) : displayModels.length === 0 ? (
                <div className="col-span-2 rounded-2xl border border-white/8 bg-black/16 px-3 py-4 text-center text-sm text-white/50">
                  {isOllamaProvider ? "No models found. Make sure Ollama is running." : "No models available."}
                </div>
              ) : (
                displayModels.map((model) => (
                  <button
                    key={model}
                    onClick={() => void handleModelChange(model)}
                    className={`rounded-2xl border px-3 py-3 text-left font-mono text-sm transition-all ${
                      currentModel === model
                        ? "border-white/22 bg-white/12 text-white"
                        : "border-transparent bg-white/5 text-white/62 hover:border-white/10 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {model}
                  </button>
                ))
              )}
            </div>

            <div className="mt-3">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Custom Model Name
                </span>
                <input
                  type="text"
                  value={settings.ai_model || ""}
                  onChange={(event) =>
                    void onUpdateSettings({ ai_model: event.target.value })
                  }
                  placeholder="Or type custom model name (e.g. gemma, llama3.2:1b)"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/24"
                />
              </label>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  {activeProvider.name} Setup
                </p>
                <p className="mt-1 text-sm text-white/60">
                  {activeProvider.description}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/55">
                {activeProvider.keyField
                  ? storedProviderKey
                    ? "Key Saved"
                    : "Needs Key"
                  : "Local"}
              </div>
            </div>

            {isOllamaProvider && (
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                  Ollama Base URL
                </span>
                <input
                  type="url"
                  value={settings.ollama_base_url || "http://127.0.0.1:11434"}
                  onChange={(event) =>
                    void onUpdateSettings({ ollama_base_url: event.target.value })
                  }
                  placeholder="http://127.0.0.1:11434"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/24"
                />
              </label>
            )}

            {activeProvider.keyField ? (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                    API Key
                  </span>
                  <input
                    type="password"
                    value={draftKeys[activeProvider.keyField]}
                    onChange={(event) =>
                      setDraftKeys((current) => ({
                        ...current,
                        [activeProvider.keyField as CloudKeyField]:
                          event.target.value,
                      }))
                    }
                    placeholder={activeProvider.keyPlaceholder}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/24"
                  />
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={() => void handleSaveKey(activeProvider)}
                    disabled={
                      savingKeyField === activeProvider.keyField ||
                      !draftKeys[activeProvider.keyField].trim()
                    }
                    className="flex-1 rounded-2xl bg-[linear-gradient(135deg,#ff995d,#ff735d)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-92 disabled:cursor-default disabled:opacity-45"
                  >
                    {savingKeyField === activeProvider.keyField
                      ? "Saving..."
                      : storedProviderKey
                        ? "Update Key"
                        : "Save Key"}
                  </button>
                  {activeProvider.keyUrl ? (
                    <a
                      href={activeProvider.keyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-white/12 bg-white/7 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/12 hover:text-white"
                    >
                      Get Key
                    </a>
                  ) : null}
                  {activeProvider.docsUrl ? (
                    <a
                      href={activeProvider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-white/12 bg-white/7 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/12 hover:text-white"
                    >
                      Docs
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {activeProvider.docsUrl ? (
                  <a
                    href={activeProvider.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/12 bg-white/7 px-4 py-3 text-sm font-medium text-white/80 transition-colors hover:bg-white/12 hover:text-white"
                  >
                    Install Ollama
                  </a>
                ) : null}
              </div>
            )}

            <div className="grid gap-2">
              {activeProvider.setup.map((step, index) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/16 px-3 py-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white/70">
                    {index + 1}
                  </div>
                  <p className="text-sm text-white/68">{step}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white/88">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                Music Playback
              </span>
            </div>

            <div className="grid gap-2">
              {MUSIC_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleMusicProviderChange(provider.id)}
                  className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                    currentMusicProvider === provider.id
                      ? "border-white/22 bg-white/12 text-white shadow-[0_12px_30px_-20px_rgba(255,140,92,0.65)]"
                      : "border-transparent bg-white/5 text-white/62 hover:border-white/10 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{provider.name}</p>
                      <p className="mt-1 text-xs text-white/55">
                        {provider.description}
                      </p>
                    </div>
                    {currentMusicProvider === provider.id ? (
                      <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
                        Active
                      </div>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white/88">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                Command Automation (Low & Medium Risk)
              </span>
            </div>

            <button
              onClick={() => handleToggle("auto_volume", !settings.auto_volume)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">Auto-adjust Volume</p>
                <p className="mt-1 text-xs text-white/52">
                  Allow AI to change system volume without Touch ID.
                </p>
              </div>
              <div
                className={`h-6 w-12 rounded-full transition-colors ${
                  settings.auto_volume
                    ? "bg-[linear-gradient(90deg,#ff995d,#ff735d)]"
                    : "bg-white/18"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    settings.auto_volume ? "translate-x-6" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </div>
            </button>

            <button
              onClick={() => handleToggle("auto_open", !settings.auto_open)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">Auto-open Apps/URLs</p>
                <p className="mt-1 text-xs text-white/52">
                  Allow AI to open applications or web links automatically.
                </p>
              </div>
              <div
                className={`h-6 w-12 rounded-full transition-colors ${
                  settings.auto_open
                    ? "bg-[linear-gradient(90deg,#ff995d,#ff735d)]"
                    : "bg-white/18"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    settings.auto_open ? "translate-x-6" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </div>
            </button>

            <button
              onClick={() => handleToggle("auto_play", !settings.auto_play)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">Auto-play Music</p>
                <p className="mt-1 text-xs text-white/52">
                  Allow AI to automatically search and play music.
                </p>
              </div>
              <div
                className={`h-6 w-12 rounded-full transition-colors ${
                  settings.auto_play
                    ? "bg-[linear-gradient(90deg,#ff995d,#ff735d)]"
                    : "bg-white/18"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    settings.auto_play ? "translate-x-6" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </div>
            </button>

            <button
              onClick={() => handleToggle("auto_web", !settings.auto_web)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">Auto-search Web</p>
                <p className="mt-1 text-xs text-white/52">
                  Allow AI to run search queries automatically in your browser.
                </p>
              </div>
              <div
                className={`h-6 w-12 rounded-full transition-colors ${
                  settings.auto_web
                    ? "bg-[linear-gradient(90deg,#ff995d,#ff735d)]"
                    : "bg-white/18"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    settings.auto_web ? "translate-x-6" : "translate-x-0.5"
                  } mt-0.5`}
                />
              </div>
            </button>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-white/88">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                Startup
              </span>
            </div>

            <button
              onClick={() =>
                handleToggle("launch_at_login", !settings.launch_at_login)
              }
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  Launch at Login
                </p>
                <p className="mt-1 text-xs text-white/52">
                  Start Nexus AI automatically when your Mac signs in.
                </p>
              </div>
              <div
                className={`h-6 w-12 rounded-full transition-colors ${
                  settings.launch_at_login
                    ? "bg-[linear-gradient(90deg,#ff995d,#ff735d)]"
                    : "bg-white/18"
                }`}
              >
                <div
                  className={`h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    settings.launch_at_login
                      ? "translate-x-6"
                      : "translate-x-0.5"
                  } mt-0.5`}
                />
              </div>
            </button>

            <button
              onClick={() =>
                handleToggle("hide_from_dock", !settings.hide_from_dock)
              }
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">Hide from Dock</p>
                <p className="mt-1 text-xs text-white/52">
                  Run as a launcher-style accessory app instead of a regular
                  Dock app.
                </p>
              </div>
              <div
                className={`h-6 w-12 rounded-full transition-colors ${
                  settings.hide_from_dock
                    ? "bg-[linear-gradient(90deg,#ff995d,#ff735d)]"
                    : "bg-white/18"
                }`}
              >
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    settings.hide_from_dock
                      ? "translate-x-6"
                      : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>

            <button
              onClick={() =>
                handleToggle(
                  "menu_bar_icon_visible",
                  !settings.menu_bar_icon_visible,
                )
              }
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-colors hover:bg-white/8"
            >
              <div>
                <p className="text-sm font-medium text-white">Menu Bar Icon</p>
                <p className="mt-1 text-xs text-white/52">
                  Show or hide the status-item icon without restarting the app.
                </p>
              </div>
              <div
                className={`h-6 w-12 rounded-full transition-colors ${
                  settings.menu_bar_icon_visible
                    ? "bg-[linear-gradient(90deg,#ff995d,#ff735d)]"
                    : "bg-white/18"
                }`}
              >
                <div
                  className={`mt-0.5 h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    settings.menu_bar_icon_visible
                      ? "translate-x-6"
                      : "translate-x-0.5"
                  }`}
                />
              </div>
            </button>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/88">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                Appearance
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onUpdateSettings({ theme: theme.id })}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    settings.theme === theme.id
                      ? "border-white/24 bg-white/12 text-white"
                      : "border-transparent bg-white/5 text-white/62 hover:border-white/10 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <div
                    className={`mb-3 h-12 rounded-xl bg-gradient-to-br ${theme.preview}`}
                  />
                  <div className="text-sm font-medium">{theme.name}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/88">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                Google Account
              </span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(78,133,255,0.12),rgba(116,84,255,0.08))] p-4">
              {authStatus?.identity_connected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/18">
                      <svg
                        className="h-5 w-5 text-green-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {authStatus.email || "Signed in"}
                      </p>
                      <p className="text-xs text-white/55">
                        {authStatus.workspace_connected
                          ? "Gmail and Drive connected"
                          : "Identity connected"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!authStatus.workspace_connected ? (
                      <button
                        onClick={handleSignInWorkspace}
                        disabled={isLoadingWorkspace}
                        className="flex-1 rounded-2xl bg-blue-500/18 px-4 py-3 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/24 disabled:cursor-default disabled:opacity-50"
                      >
                        {isLoadingWorkspace
                          ? "Connecting..."
                          : "Connect Gmail & Drive"}
                      </button>
                    ) : null}
                    <button
                      onClick={handleSignOut}
                      className="flex-1 rounded-2xl bg-red-500/14 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/22"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/68">
                    Sign in through `browser.ponsrischool.in` first, then
                    optionally add Gmail and Drive access for tools.
                  </p>
                  <button
                    onClick={handleSignInIdentity}
                    disabled={isLoadingIdentity}
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#4f8cff,#6d5cff)] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-92 disabled:cursor-default disabled:opacity-50"
                  >
                    {isLoadingIdentity
                      ? "Opening browser..."
                      : "Sign in via browser.ponsrischool.in"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between text-white/88">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/58">
                  Long-Term Memory (RAG Context)
                </span>
              </div>
            </div>

            <p className="text-xs text-white/45 leading-relaxed">
              These are facts and preferences Thuki has learned about you. They are injected as local RAG context on every new prompt. You can manually add, edit, or delete them.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                placeholder="Add new memory (e.g. My birthday is July 4th)"
                className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/24"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAddMemory();
                }}
              />
              <button
                onClick={handleAddMemory}
                className="rounded-2xl bg-[linear-gradient(135deg,#ff995d,#ff6b5d)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {memories.length === 0 ? (
                <div className="rounded-2xl border border-white/8 bg-black/10 py-5 text-center text-sm text-white/40">
                  Thuki hasn't learned any memories yet.
                </div>
              ) : (
                memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/4 p-3.5 transition-all hover:bg-white/6"
                  >
                    {editingMemoryId === mem.id ? (
                      <input
                        type="text"
                        value={editingMemoryText}
                        onChange={(e) => setEditingMemoryText(e.target.value)}
                        className="flex-1 rounded-xl border border-white/14 bg-black/35 px-3 py-1.5 text-sm text-white outline-none focus:border-white/24"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleSaveEdit(mem.id);
                          if (e.key === "Escape") setEditingMemoryId(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm text-white/82">{mem.content}</span>
                    )}

                    <div className="flex shrink-0 gap-1.5">
                      {editingMemoryId === mem.id ? (
                        <>
                          <button
                            onClick={() => void handleSaveEdit(mem.id)}
                            className="rounded-xl bg-green-500/18 px-3 py-1.5 text-xs font-semibold text-green-300 transition-colors hover:bg-green-500/26"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMemoryId(null)}
                            className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/16"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(mem.id, mem.content)}
                            className="rounded-xl bg-white/6 px-3 py-1.5 text-xs font-semibold text-white/62 transition-colors hover:bg-white/12 hover:text-white"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => void handleDeleteMemory(mem.id)}
                            className="rounded-xl bg-red-500/12 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/22"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  );
}
