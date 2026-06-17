export interface McpHttpServerConfig {
  id: string;
  label: string;
  server_url: string;
  server_description?: string | null;
  authorization?: string | null;
  headers: Record<string, string>;
  enabled: boolean;
}

export interface AppSettings {
  ai_provider: string;
  ai_model: string;
  music_provider: string;
  openai_api_key?: string | null;
  google_api_key?: string | null;
  anthropic_api_key?: string | null;
  xai_api_key?: string | null;
  groq_api_key?: string | null;
  github_access_token?: string | null;
  exa_api_key?: string | null;
  ollama_base_url: string;
  comet_host: string;
  comet_port: number;
  comet_app_target?: string | null;
  google_client_id?: string | null;
  google_client_secret?: string | null;
  google_credentials_path?: string | null;
  google_token_path?: string | null;
  gmail_enabled: boolean;
  drive_enabled: boolean;
  menu_bar_icon_visible: boolean;
  auth_bridge_base_url: string;
  auth_bridge_app_token?: string | null;
  shared_keychain_access_group?: string | null;
  mcp_http_servers: McpHttpServerConfig[];
  launch_at_login: boolean;
  hide_from_dock: boolean;
  theme: string;
  auto_volume: boolean;
  auto_open: boolean;
  auto_play: boolean;
  auto_web: boolean;
}

export type AppSettingsPatch = Partial<AppSettings>;
