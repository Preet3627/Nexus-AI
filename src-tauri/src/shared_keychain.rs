use base64::{engine::general_purpose::STANDARD, Engine as _};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

const HELPER_FILE: &str = "SharedKeychain.swift";
const WORKSPACE_SESSION_SERVICE: &str = "in.ponsri.shared.google.workspace";
const IDENTITY_SESSION_SERVICE: &str = "in.ponsri.shared.google.identity";
const SHARED_ACCOUNT: &str = "default";

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct GoogleAuthSession {
    pub uid: Option<String>,
    pub email: Option<String>,
    pub name: Option<String>,
    pub photo: Option<String>,
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub id_token: Option<String>,
    pub expires_at: Option<i64>,
    pub scopes: Vec<String>,
    pub firebase_config: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Deserialize)]
struct KeychainBridgeResponse {
    success: bool,
    found: Option<bool>,
    value: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum KeychainNamespace {
    Identity,
    Workspace,
}

impl KeychainNamespace {
    fn service_name(self) -> &'static str {
        match self {
            Self::Identity => IDENTITY_SESSION_SERVICE,
            Self::Workspace => WORKSPACE_SESSION_SERVICE,
        }
    }
}

fn ensure_helper(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("swift");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(HELPER_FILE);
    std::fs::write(&path, include_str!("../swift/SharedKeychain.swift"))
        .map_err(|e| e.to_string())?;
    Ok(path)
}

fn execute_keychain(
    app_handle: &AppHandle,
    namespace: KeychainNamespace,
    synchronizable: bool,
    access_group: Option<&str>,
    action: &str,
    value: Option<&str>,
) -> Result<KeychainBridgeResponse, String> {
    let helper = ensure_helper(app_handle)?;
    let mut command = Command::new("/usr/bin/swift");
    command
        .arg(helper)
        .arg(action)
        .arg(namespace.service_name())
        .arg(SHARED_ACCOUNT)
        .arg(if synchronizable { "1" } else { "0" })
        .arg(access_group.unwrap_or(""));

    if let Some(payload) = value {
        command.arg(STANDARD.encode(payload));
    }

    let output = command
        .output()
        .map_err(|e| format!("Swift toolchain is required for Keychain access: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Keychain helper failed.".to_string()
        } else {
            stderr
        });
    }

    serde_json::from_slice::<KeychainBridgeResponse>(&output.stdout)
        .map_err(|e| format!("Failed to parse Keychain helper response: {e}"))
}

pub fn save_session(
    app_handle: &AppHandle,
    namespace: KeychainNamespace,
    session: &GoogleAuthSession,
    access_group: Option<&str>,
) -> Result<(), String> {
    let payload = serde_json::to_string(session).map_err(|e| e.to_string())?;
    let response = execute_keychain(
        app_handle,
        namespace,
        true,
        access_group,
        "set",
        Some(&payload),
    )?;
    if response.success {
        Ok(())
    } else {
        Err(response
            .error
            .unwrap_or_else(|| "Failed to save shared keychain item.".to_string()))
    }
}

pub fn load_session(
    app_handle: &AppHandle,
    namespace: KeychainNamespace,
    access_group: Option<&str>,
) -> Result<Option<GoogleAuthSession>, String> {
    let response = execute_keychain(app_handle, namespace, true, access_group, "get", None)?;
    if response.found == Some(false) {
        return Ok(None);
    }

    response
        .value
        .map(|raw| serde_json::from_str::<GoogleAuthSession>(&raw).map_err(|e| e.to_string()))
        .transpose()
}

pub fn delete_session(
    app_handle: &AppHandle,
    namespace: KeychainNamespace,
    access_group: Option<&str>,
) -> Result<(), String> {
    let response = execute_keychain(app_handle, namespace, true, access_group, "delete", None)?;
    if response.success {
        Ok(())
    } else {
        Err(response
            .error
            .unwrap_or_else(|| "Failed to delete shared keychain item.".to_string()))
    }
}

pub fn load_typed<T: DeserializeOwned>(
    app_handle: &AppHandle,
    namespace: KeychainNamespace,
    access_group: Option<&str>,
) -> Result<Option<T>, String> {
    let session = load_session(app_handle, namespace, access_group)?;
    session
        .map(|value| {
            serde_json::from_value(serde_json::to_value(value).unwrap()).map_err(|e| e.to_string())
        })
        .transpose()
}
