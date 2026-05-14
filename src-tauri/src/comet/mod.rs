use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::command;

static COMET_CONNECTED: AtomicBool = AtomicBool::new(false);
static COMET_HOST: std::sync::LazyLock<std::sync::Mutex<String>> =
    std::sync::LazyLock::new(|| std::sync::Mutex::new("localhost".to_string()));
static COMET_PORT: std::sync::Mutex<u16> = std::sync::Mutex::new(9922);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CometTab {
    pub id: String,
    pub url: String,
    pub title: String,
    pub is_loading: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CometAction {
    pub action: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CometResult {
    pub success: bool,
    pub result: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CometConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct CometLaunchOptions {
    pub target: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub url: Option<String>,
    pub wait_ms: Option<u64>,
}

impl Default for CometConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 9922,
        }
    }
}

fn get_base_url() -> String {
    let host = COMET_HOST.lock().unwrap().clone();
    let port = *COMET_PORT.lock().unwrap();
    format!("http://{}:{}", host, port)
}

fn open_comet_target(target: &str) -> Result<(), String> {
    let trimmed = target.trim();
    if trimmed.is_empty() {
        return Err("Comet target is empty.".to_string());
    }

    let status = if trimmed.ends_with(".app") || std::path::Path::new(trimmed).exists() {
        std::process::Command::new("open")
            .arg(trimmed)
            .status()
            .map_err(|e| e.to_string())?
    } else {
        std::process::Command::new("open")
            .args(["-a", trimmed])
            .status()
            .map_err(|e| e.to_string())?
    };

    if status.success() {
        Ok(())
    } else {
        Err(format!("macOS could not launch Comet target `{trimmed}`."))
    }
}

async fn try_connect(host: &str, port: u16) -> Result<(), String> {
    {
        let mut locked_host = COMET_HOST.lock().unwrap();
        *locked_host = host.to_string();
    }
    {
        let mut locked_port = COMET_PORT.lock().unwrap();
        *locked_port = port;
    }

    reqwest::get(get_base_url().as_str())
        .await
        .map_err(|e| format!("Cannot connect to Comet-AI: {e}"))?;
    COMET_CONNECTED.store(true, Ordering::SeqCst);
    Ok(())
}

#[command]
pub async fn comet_connect(config: Option<CometConfig>) -> Result<bool, String> {
    let config = config.unwrap_or_default();
    tracing::info!("Connecting to Comet-AI at {}:{}", config.host, config.port);
    try_connect(&config.host, config.port).await.map(|_| true)
}

#[command]
pub async fn comet_launch(options: Option<CometLaunchOptions>) -> Result<String, String> {
    let options = options.unwrap_or_default();
    let target = options
        .target
        .filter(|item| !item.trim().is_empty())
        .unwrap_or_else(|| "Comet-AI".to_string());
    open_comet_target(&target)?;
    Ok(format!("Launched Comet target `{target}`."))
}

#[command]
pub async fn comet_launch_and_connect(
    options: Option<CometLaunchOptions>,
) -> Result<String, String> {
    let options = options.unwrap_or_default();
    let target = options
        .target
        .clone()
        .filter(|item| !item.trim().is_empty())
        .unwrap_or_else(|| "Comet-AI".to_string());
    let host = options
        .host
        .filter(|item| !item.trim().is_empty())
        .unwrap_or_else(|| "localhost".to_string());
    let port = options.port.unwrap_or(9922);
    let wait_ms = options.wait_ms.unwrap_or(1_500);

    open_comet_target(&target)?;
    std::thread::sleep(Duration::from_millis(wait_ms));
    try_connect(&host, port).await?;

    if let Some(url) = options.url.filter(|item| !item.trim().is_empty()) {
        let _ = comet_open_url(url).await;
    }

    Ok(format!(
        "Comet-AI is available at http://{}:{} and ready for browser tasks.",
        host, port
    ))
}

#[command]
pub async fn comet_disconnect() -> Result<(), String> {
    tracing::info!("Disconnecting from Comet-AI");
    COMET_CONNECTED.store(false, Ordering::SeqCst);
    Ok(())
}

#[command]
pub async fn comet_status() -> Result<bool, String> {
    Ok(COMET_CONNECTED.load(Ordering::SeqCst))
}

#[command]
pub async fn comet_get_tabs() -> Result<Vec<CometTab>, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let url = format!("{}/api/tabs", base_url);

    match reqwest::get(&url).await {
        Ok(response) => match response.json::<Vec<CometTab>>().await {
            Ok(tabs) => Ok(tabs),
            Err(_) => Ok(vec![]),
        },
        Err(e) => {
            tracing::error!("Failed to get tabs: {}", e);
            Ok(vec![])
        }
    }
}

#[command]
pub async fn comet_create_tab(url: Option<String>) -> Result<CometTab, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let target_url = url.unwrap_or_else(|| "about:blank".to_string());
    let base_url = get_base_url();
    let api_url = format!("{}/api/create-tab", base_url);

    let client = reqwest::Client::new();
    match client
        .post(&api_url)
        .json(&serde_json::json!({ "url": target_url }))
        .send()
        .await
    {
        Ok(response) => match response.json::<CometTab>().await {
            Ok(tab) => Ok(tab),
            Err(_) => Ok(CometTab {
                id: format!("tab-{}", chrono::Utc::now().timestamp_millis()),
                url: target_url,
                title: "New Tab".to_string(),
                is_loading: true,
            }),
        },
        Err(e) => Err(format!("Failed to create tab: {}", e)),
    }
}

#[command]
pub async fn comet_close_tab(tab_id: String) -> Result<bool, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/close-tab", base_url);

    let client = reqwest::Client::new();
    match client
        .post(&api_url)
        .json(&serde_json::json!({ "tabId": tab_id }))
        .send()
        .await
    {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Failed to close tab: {}", e)),
    }
}

#[command]
pub async fn comet_navigate_tab(tab_id: String, url: String) -> Result<bool, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/navigate-tab", base_url);

    let client = reqwest::Client::new();
    match client
        .post(&api_url)
        .json(&serde_json::json!({ "tabId": tab_id, "url": url }))
        .send()
        .await
    {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Failed to navigate: {}", e)),
    }
}

#[command]
pub async fn comet_execute_script(code: String) -> Result<String, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/execute-script", base_url);

    let client = reqwest::Client::new();
    match client
        .post(&api_url)
        .json(&serde_json::json!({ "code": code }))
        .send()
        .await
    {
        Ok(response) => match response.text().await {
            Ok(text) => Ok(text),
            Err(_) => Ok("".to_string()),
        },
        Err(e) => Err(format!("Failed to execute script: {}", e)),
    }
}

#[command]
pub async fn comet_capture_page() -> Result<String, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/capture-page", base_url);

    let client = reqwest::Client::new();
    match client.get(&api_url).send().await {
        Ok(response) => match response.text().await {
            Ok(html) => Ok(html),
            Err(_) => Ok("".to_string()),
        },
        Err(e) => Err(format!("Failed to capture page: {}", e)),
    }
}

#[command]
pub async fn comet_extract_content() -> Result<String, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/extract-content", base_url);

    let client = reqwest::Client::new();
    match client.get(&api_url).send().await {
        Ok(response) => {
            #[derive(Deserialize)]
            struct ExtractResult {
                content: String,
            }

            match response.json::<ExtractResult>().await {
                Ok(result) => Ok(result.content),
                Err(_) => Ok("".to_string()),
            }
        }
        Err(e) => Err(format!("Failed to extract content: {}", e)),
    }
}

#[command]
pub async fn comet_find_and_click(text: String) -> Result<bool, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/find-and-click", base_url);

    let client = reqwest::Client::new();
    match client
        .post(&api_url)
        .json(&serde_json::json!({ "text": text }))
        .send()
        .await
    {
        Ok(response) => {
            #[derive(Deserialize)]
            struct ClickResult {
                success: bool,
            }

            match response.json::<ClickResult>().await {
                Ok(result) => Ok(result.success),
                Err(_) => Ok(false),
            }
        }
        Err(e) => Err(format!("Failed to find and click: {}", e)),
    }
}

#[command]
pub async fn comet_get_selected_text() -> Result<String, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/get-selected-text", base_url);

    let client = reqwest::Client::new();
    match client.get(&api_url).send().await {
        Ok(response) => {
            #[derive(Deserialize)]
            struct TextResult {
                text: String,
            }

            match response.json::<TextResult>().await {
                Ok(result) => Ok(result.text),
                Err(_) => Ok("".to_string()),
            }
        }
        Err(e) => Err(format!("Failed to get selected text: {}", e)),
    }
}

#[command]
pub async fn comet_type_text(text: String) -> Result<bool, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/type-text", base_url);

    let client = reqwest::Client::new();
    match client
        .post(&api_url)
        .json(&serde_json::json!({ "text": text }))
        .send()
        .await
    {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Failed to type text: {}", e)),
    }
}

#[command]
pub async fn comet_open_url(url: String) -> Result<CometTab, String> {
    comet_create_tab(Some(url)).await
}

#[command]
pub async fn comet_go_back() -> Result<bool, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/go-back", base_url);

    let client = reqwest::Client::new();
    match client.post(&api_url).send().await {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Failed to go back: {}", e)),
    }
}

#[command]
pub async fn comet_go_forward() -> Result<bool, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/go-forward", base_url);

    let client = reqwest::Client::new();
    match client.post(&api_url).send().await {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Failed to go forward: {}", e)),
    }
}

#[command]
pub async fn comet_reload() -> Result<bool, String> {
    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/reload", base_url);

    let client = reqwest::Client::new();
    match client.post(&api_url).send().await {
        Ok(_) => Ok(true),
        Err(e) => Err(format!("Failed to reload: {}", e)),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthSyncStatus {
    pub identity_shared: bool,
    pub workspace_shared: bool,
    pub message: String,
}

#[command]
pub async fn comet_share_auth(app_handle: tauri::AppHandle) -> Result<AuthSyncStatus, String> {
    use crate::shared_keychain;

    if !COMET_CONNECTED.load(Ordering::SeqCst) {
        return Err("Not connected to Comet-AI".to_string());
    }

    let access_group: Option<&str> = None;

    let identity = shared_keychain::load_session(
        &app_handle,
        shared_keychain::KeychainNamespace::Identity,
        access_group,
    )
    .ok()
    .flatten();

    let workspace = shared_keychain::load_session(
        &app_handle,
        shared_keychain::KeychainNamespace::Workspace,
        access_group,
    )
    .ok()
    .flatten();

    let identity_shared = identity.is_some();
    let workspace_shared = workspace.is_some();

    if !identity_shared && !workspace_shared {
        return Ok(AuthSyncStatus {
            identity_shared: false,
            workspace_shared: false,
            message: "No authentication sessions found. Sign in with /signin first.".to_string(),
        });
    }

    let base_url = get_base_url();
    let api_url = format!("{}/api/auth-sync", base_url);

    let sync_payload = serde_json::json!({
        "identity": identity,
        "workspace": workspace,
    });

    let client = reqwest::Client::new();
    match client.post(&api_url).json(&sync_payload).send().await {
        Ok(response) => {
            if response.status().is_success() {
                Ok(AuthSyncStatus {
                    identity_shared,
                    workspace_shared,
                    message: "Authentication shared with Comet-AI".to_string(),
                })
            } else {
                Ok(AuthSyncStatus {
                    identity_shared,
                    workspace_shared,
                    message: "Auth synced locally, Comet-AI endpoint responded with error"
                        .to_string(),
                })
            }
        }
        Err(e) => Ok(AuthSyncStatus {
            identity_shared,
            workspace_shared,
            message: format!(
                "Auth available in iCloud Keychain. Failed to notify Comet: {}",
                e
            ),
        }),
    }
}
