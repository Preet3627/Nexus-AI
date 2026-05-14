use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

#[cfg(target_os = "macos")]
use tauri::ActivationPolicy;

use crate::{database, history::Database};

const APP_SETTINGS_KEY: &str = "app_settings";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct McpHttpServerConfig {
    pub id: String,
    pub label: String,
    pub server_url: String,
    pub server_description: Option<String>,
    pub authorization: Option<String>,
    pub headers: std::collections::BTreeMap<String, String>,
    pub enabled: bool,
}

impl Default for McpHttpServerConfig {
    fn default() -> Self {
        Self {
            id: "exa-web-search".to_string(),
            label: "Exa Web Search".to_string(),
            server_url: "https://mcp.exa.ai/mcp".to_string(),
            server_description: Some(
                "Remote MCP server for web search and code-context retrieval.".to_string(),
            ),
            authorization: None,
            headers: std::collections::BTreeMap::new(),
            enabled: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    pub ai_provider: String,
    pub ai_model: String,
    pub music_provider: String,
    pub openai_api_key: Option<String>,
    pub google_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub xai_api_key: Option<String>,
    pub github_access_token: Option<String>,
    pub exa_api_key: Option<String>,
    pub ollama_base_url: String,
    pub comet_host: String,
    pub comet_port: u16,
    pub comet_app_target: Option<String>,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_credentials_path: Option<String>,
    pub google_token_path: Option<String>,
    pub gmail_enabled: bool,
    pub drive_enabled: bool,
    pub menu_bar_icon_visible: bool,
    pub auth_bridge_base_url: String,
    pub auth_bridge_app_token: Option<String>,
    pub shared_keychain_access_group: Option<String>,
    pub mcp_http_servers: Vec<McpHttpServerConfig>,
    pub launch_at_login: bool,
    pub hide_from_dock: bool,
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            ai_provider: "ollama".to_string(),
            ai_model: "gemma4:e2b".to_string(),
            music_provider: "youtube".to_string(),
            openai_api_key: None,
            google_api_key: None,
            anthropic_api_key: None,
            xai_api_key: None,
            github_access_token: None,
            exa_api_key: None,
            ollama_base_url: "http://127.0.0.1:11434".to_string(),
            comet_host: "localhost".to_string(),
            comet_port: 9922,
            comet_app_target: Some("Comet-AI".to_string()),
            google_client_id: None,
            google_client_secret: None,
            google_credentials_path: None,
            google_token_path: None,
            gmail_enabled: false,
            drive_enabled: false,
            menu_bar_icon_visible: true,
            auth_bridge_base_url: "https://browser.ponsrischool.in".to_string(),
            auth_bridge_app_token: Some("comet-secure-v1".to_string()),
            shared_keychain_access_group: None,
            mcp_http_servers: vec![McpHttpServerConfig::default()],
            launch_at_login: false,
            hide_from_dock: false,
            theme: "dark".to_string(),
        }
    }
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct AppSettingsPatch {
    pub ai_provider: Option<String>,
    pub ai_model: Option<String>,
    pub music_provider: Option<String>,
    pub openai_api_key: Option<String>,
    pub google_api_key: Option<String>,
    pub anthropic_api_key: Option<String>,
    pub xai_api_key: Option<String>,
    pub github_access_token: Option<String>,
    pub exa_api_key: Option<String>,
    pub ollama_base_url: Option<String>,
    pub comet_host: Option<String>,
    pub comet_port: Option<u16>,
    pub comet_app_target: Option<String>,
    pub google_client_id: Option<String>,
    pub google_client_secret: Option<String>,
    pub google_credentials_path: Option<String>,
    pub google_token_path: Option<String>,
    pub gmail_enabled: Option<bool>,
    pub drive_enabled: Option<bool>,
    pub menu_bar_icon_visible: Option<bool>,
    pub auth_bridge_base_url: Option<String>,
    pub auth_bridge_app_token: Option<String>,
    pub shared_keychain_access_group: Option<String>,
    pub mcp_http_servers: Option<Vec<McpHttpServerConfig>>,
    pub launch_at_login: Option<bool>,
    pub hide_from_dock: Option<bool>,
    pub theme: Option<String>,
}

fn normalize_provider(provider: &str) -> String {
    match provider.trim().to_lowercase().as_str() {
        "openai" | "vercel-openai" => "vercel-openai".to_string(),
        "google" | "gemini" | "vercel-google" => "vercel-google".to_string(),
        "anthropic" | "vercel-anthropic" => "vercel-anthropic".to_string(),
        "xai" | "grok" | "vercel-xai" => "vercel-xai".to_string(),
        _ => "ollama".to_string(),
    }
}

fn normalize_music_provider(provider: &str) -> String {
    match provider.trim().to_lowercase().as_str() {
        "apple" | "apple-music" | "apple_music" | "music" | "itunes" => "apple-music".to_string(),
        "spotify" => "spotify".to_string(),
        _ => "youtube".to_string(),
    }
}

fn non_empty(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn normalize_theme(theme: &str) -> Option<String> {
    match theme.trim().to_lowercase().as_str() {
        "dark" | "light" | "graphite" | "aurora" | "dawn" => Some(theme.trim().to_lowercase()),
        _ => None,
    }
}

pub fn load_from_connection(conn: &Connection) -> Result<AppSettings, String> {
    database::get_config(conn, APP_SETTINGS_KEY)
        .map_err(|e| e.to_string())?
        .map(|raw| serde_json::from_str::<AppSettings>(&raw).map_err(|e| e.to_string()))
        .transpose()
        .map(|value| value.unwrap_or_default())
}

pub fn save_to_connection(conn: &Connection, settings: &AppSettings) -> Result<(), String> {
    let raw = serde_json::to_string(settings).map_err(|e| e.to_string())?;
    database::set_config(conn, APP_SETTINGS_KEY, &raw).map_err(|e| e.to_string())
}

pub fn load_from_app_handle(app_handle: &tauri::AppHandle) -> AppSettings {
    app_handle
        .try_state::<Database>()
        .and_then(|db| {
            db.0.lock()
                .ok()
                .and_then(|conn| load_from_connection(&conn).ok())
        })
        .unwrap_or_default()
}

fn merge_patch(mut settings: AppSettings, patch: AppSettingsPatch) -> AppSettings {
    if let Some(provider) = patch.ai_provider {
        settings.ai_provider = normalize_provider(&provider);
    }

    if let Some(model) = non_empty(patch.ai_model) {
        settings.ai_model = model;
    }

    if let Some(provider) = patch.music_provider {
        settings.music_provider = normalize_music_provider(&provider);
    }

    if let Some(value) = non_empty(patch.openai_api_key) {
        settings.openai_api_key = Some(value);
    }

    if let Some(value) = non_empty(patch.google_api_key) {
        settings.google_api_key = Some(value);
    }

    if let Some(value) = non_empty(patch.anthropic_api_key) {
        settings.anthropic_api_key = Some(value);
    }

    if let Some(value) = non_empty(patch.xai_api_key) {
        settings.xai_api_key = Some(value);
    }

    if let Some(value) = non_empty(patch.github_access_token) {
        settings.github_access_token = Some(value);
    }

    if let Some(value) = non_empty(patch.exa_api_key) {
        settings.exa_api_key = Some(value);
    }

    if let Some(value) = non_empty(patch.ollama_base_url) {
        settings.ollama_base_url = value;
    }

    if let Some(value) = non_empty(patch.comet_host) {
        settings.comet_host = value;
    }

    if let Some(value) = patch.comet_port {
        settings.comet_port = value.max(1);
    }

    if let Some(value) = non_empty(patch.comet_app_target) {
        settings.comet_app_target = Some(value);
    }

    if let Some(value) = non_empty(patch.google_client_id) {
        settings.google_client_id = Some(value);
    }

    if let Some(value) = non_empty(patch.google_client_secret) {
        settings.google_client_secret = Some(value);
    }

    if let Some(value) = non_empty(patch.google_credentials_path) {
        settings.google_credentials_path = Some(value);
    }

    if let Some(value) = non_empty(patch.google_token_path) {
        settings.google_token_path = Some(value);
    }

    if let Some(value) = patch.gmail_enabled {
        settings.gmail_enabled = value;
    }

    if let Some(value) = patch.drive_enabled {
        settings.drive_enabled = value;
    }

    if let Some(value) = patch.menu_bar_icon_visible {
        settings.menu_bar_icon_visible = value;
    }

    if let Some(value) = non_empty(patch.auth_bridge_base_url) {
        settings.auth_bridge_base_url = value;
    }

    if let Some(value) = non_empty(patch.auth_bridge_app_token) {
        settings.auth_bridge_app_token = Some(value);
    }

    if let Some(value) = non_empty(patch.shared_keychain_access_group) {
        settings.shared_keychain_access_group = Some(value);
    }

    if let Some(mut servers) = patch.mcp_http_servers {
        servers.retain(|server| {
            !server.id.trim().is_empty()
                && !server.label.trim().is_empty()
                && !server.server_url.trim().is_empty()
        });
        settings.mcp_http_servers = servers;
    }

    if let Some(value) = patch.launch_at_login {
        settings.launch_at_login = value;
    }

    if let Some(value) = patch.hide_from_dock {
        settings.hide_from_dock = value;
    }

    if let Some(value) = patch.theme {
        if let Some(normalized) = normalize_theme(&value) {
            settings.theme = normalized;
        }
    }

    settings
}

fn apply_runtime_side_effects(
    app_handle: &AppHandle,
    old_settings: &AppSettings,
    settings: &AppSettings,
) {
    #[cfg(target_os = "macos")]
    {
        if settings.hide_from_dock != old_settings.hide_from_dock {
            if settings.hide_from_dock {
                let _ = app_handle.set_activation_policy(ActivationPolicy::Accessory);
            } else {
                let _ = app_handle.set_activation_policy(ActivationPolicy::Regular);
            }
        }
    }

    if settings.menu_bar_icon_visible != old_settings.menu_bar_icon_visible {
        if let Some(tray) = app_handle.tray_by_id(crate::native_actions::TRAY_ID) {
            let _ = tray.set_visible(settings.menu_bar_icon_visible);
        }
    }

    if settings.theme != old_settings.theme {
        let _ = app_handle.emit("theme-changed", settings.theme.clone());
    }
}

#[tauri::command]
pub fn get_app_settings(db: tauri::State<'_, Database>) -> Result<AppSettings, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    load_from_connection(&conn)
}

#[tauri::command]
pub fn update_app_settings(
    patch: AppSettingsPatch,
    db: tauri::State<'_, Database>,
    app_handle: tauri::AppHandle,
) -> Result<AppSettings, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let old_settings = load_from_connection(&conn)?;
    let settings = merge_patch(old_settings.clone(), patch);
    save_to_connection(&conn, &settings)?;
    drop(conn);

    // Handle side effects
    if settings.launch_at_login != old_settings.launch_at_login {
        if settings.launch_at_login {
            let _ = crate::auto_launch::enable_launch_at_login();
        } else {
            let _ = crate::auto_launch::disable_launch_at_login();
        }
    }

    apply_runtime_side_effects(&app_handle, &old_settings, &settings);

    Ok(settings)
}
