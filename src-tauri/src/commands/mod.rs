use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub require_auth: bool,
    pub auth_timeout: i32,
    pub storage_backend: String,
    pub enable_cloud_sync: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            require_auth: true,
            auth_timeout: 300,
            storage_backend: "secure-enclave".to_string(),
            enable_cloud_sync: false,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenCaptureResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

#[command]
pub async fn send_message(message: String) -> Result<ChatResponse, String> {
    tracing::info!("Sending message: {}", message);
    Ok(ChatResponse { content: format!("Echo: {}", message) })
}

#[command]
pub async fn capture_screen() -> Result<ScreenCaptureResult, String> {
    tracing::info!("Capturing screen");
    Ok(ScreenCaptureResult {
        success: false,
        path: None,
        error: Some("Screen capture not implemented".to_string()),
    })
}

#[command]
pub async fn authenticate(reason: String) -> Result<bool, String> {
    tracing::info!("Authentication requested: {}", reason);
    Ok(true)
}

#[command]
pub fn get_settings() -> Result<Settings, String> {
    Ok(Settings::default())
}

#[command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    tracing::info!("Saving settings: {:?}", settings);
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenshotData {
    pub path: String,
    pub base64: String,
    pub width: u32,
    pub height: u32,
}

#[command]
pub fn get_screenshot(path: String) -> Result<ScreenshotData, String> {
    use std::fs;
    use base64::Engine as _;
    use base64::engine::general_purpose::STANDARD as BASE64;

    let data = fs::read(&path)
        .map_err(|e| format!("Failed to read screenshot: {}", e))?;

    let base64_data = BASE64.encode(&data);

    Ok(ScreenshotData {
        path,
        base64: base64_data,
        width: 1920,
        height: 1080,
    })
}
