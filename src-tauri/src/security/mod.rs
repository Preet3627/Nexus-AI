use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub accessibility: bool,
    pub screen_recording: bool,
    pub microphone: bool,
    pub camera: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Permission {
    pub name: String,
}

#[cfg(target_os = "macos")]
mod macos {
    use std::process::Command;

    pub fn check_accessibility() -> bool {
        Command::new("osascript")
            .args(["-e", "tell application \"System Events\" to return true"])
            .output()
            .is_ok()
    }

    pub fn check_screen_recording() -> bool {
        Command::new("screencapture")
            .arg("-x")
            .arg("/dev/null")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

#[cfg(not(target_os = "macos"))]
mod macos {
    use super::*;

    pub fn check_accessibility() -> bool {
        false
    }

    pub fn check_screen_recording() -> bool {
        false
    }
}

#[command]
pub fn check_permissions() -> Result<PermissionStatus, String> {
    tracing::info!("Checking permissions");

    Ok(PermissionStatus {
        accessibility: macos::check_accessibility(),
        screen_recording: macos::check_screen_recording(),
        microphone: false,
        camera: false,
    })
}

#[command]
pub fn request_permission(permission: Permission) -> Result<(), String> {
    tracing::info!("Requesting permission: {}", permission.name);

    match permission.name.as_str() {
        "accessibility" => {
            #[cfg(target_os = "macos")]
            {
                use std::process::Command;
                let _ = Command::new("open")
                    .args(["x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"])
                    .spawn();
            }
        }
        "screen_recording" => {
            #[cfg(target_os = "macos")]
            {
                use std::process::Command;
                let _ = Command::new("open")
                    .args(["x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"])
                    .spawn();
            }
        }
        _ => {}
    }

    Ok(())
}
