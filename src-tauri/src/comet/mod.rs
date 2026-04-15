use serde::{Deserialize, Serialize};
use tauri::command;

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

impl Default for CometConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 3004,
        }
    }
}

static mut COMET_CONNECTED: bool = false;

#[command]
pub async fn connect(config: Option<CometConfig>) -> Result<bool, String> {
    let config = config.unwrap_or_default();
    tracing::info!("Connecting to Comet-AI at {}:{}", config.host, config.port);

    unsafe {
        COMET_CONNECTED = true;
    }

    Ok(true)
}

#[command]
pub async fn disconnect() -> Result<(), String> {
    tracing::info!("Disconnecting from Comet-AI");

    unsafe {
        COMET_CONNECTED = false;
    }

    Ok(())
}

#[command]
pub async fn execute_action(action: CometAction) -> Result<CometResult, String> {
    tracing::info!("Executing Comet action: {}", action.action);

    unsafe {
        if !COMET_CONNECTED {
            return Ok(CometResult {
                success: false,
                result: None,
                error: Some("Not connected to Comet-AI".to_string()),
            });
        }
    }

    match action.action.as_str() {
        "navigate" => {
            if let Some(params) = action.params {
                if let Some(url) = params.get("url").and_then(|v| v.as_str()) {
                    tracing::info!("Navigating to: {}", url);
                    return Ok(CometResult {
                        success: true,
                        result: Some(format!("Navigated to {}", url)),
                        error: None,
                    });
                }
            }
        }
        "screenshot" => {
            return Ok(CometResult {
                success: true,
                result: Some("Screenshot captured".to_string()),
                error: None,
            });
        }
        "shell" => {
            if let Some(params) = action.params {
                if let Some(cmd) = params.get("command").and_then(|v| v.as_str()) {
                    tracing::info!("Executing shell command: {}", cmd);
                    return Ok(CometResult {
                        success: true,
                        result: Some(format!("Executed: {}", cmd)),
                        error: None,
                    });
                }
            }
        }
        _ => {
            return Ok(CometResult {
                success: false,
                result: None,
                error: Some(format!("Unknown action: {}", action.action)),
            });
        }
    }

    Ok(CometResult {
        success: false,
        result: None,
        error: Some("Invalid parameters".to_string()),
    })
}
