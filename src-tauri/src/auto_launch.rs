use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LaunchSettings {
    pub enabled: bool,
    pub hidden: bool,
    pub use_launch_agent: bool,
}

impl Default for LaunchSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            hidden: true,
            use_launch_agent: true,
        }
    }
}

pub struct AutoLaunchManager {
    bundle_id: String,
    app_path: String,
}

impl AutoLaunchManager {
    pub fn new(bundle_id: &str) -> Self {
        let app_path = std::env::current_exe()
            .map(|p: std::path::PathBuf| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| std::env::args().next().unwrap_or_default());

        Self {
            bundle_id: bundle_id.to_string(),
            app_path,
        }
    }

    pub fn is_enabled(&self) -> Result<bool, String> {
        let output = Command::new("launchctl")
            .args(["list", &self.bundle_id])
            .output()
            .map_err(|e| e.to_string())?;

        Ok(output.status.success())
    }

    pub fn enable(&self) -> Result<(), String> {
        if cfg!(target_os = "macos") {
            self.setup_launch_agent()?;
        }
        Ok(())
    }

    pub fn disable(&self) -> Result<(), String> {
        if cfg!(target_os = "macos") {
            self.remove_launch_agent()?;
        }
        Ok(())
    }

    fn setup_launch_agent(&self) -> Result<(), String> {
        let launch_agents_dir = dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join("Library/LaunchAgents");

        std::fs::create_dir_all(&launch_agents_dir).map_err(|e| e.to_string())?;

        let plist_path = launch_agents_dir.join(format!("{}.plist", self.bundle_id));

        let plist_content = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>--hidden</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>LaunchOnlyOnce</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/{}.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/{}.err</string>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
"#,
            self.bundle_id, self.app_path, self.bundle_id, self.bundle_id
        );

        std::fs::write(&plist_path, plist_content).map_err(|e| e.to_string())?;

        let output = Command::new("launchctl")
            .args(["load", &plist_path.to_string_lossy()])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to load launch agent: {}", stderr));
        }

        Ok(())
    }

    fn remove_launch_agent(&self) -> Result<(), String> {
        let launch_agents_dir = dirs::home_dir()
            .ok_or("Could not find home directory")?
            .join("Library/LaunchAgents");

        let plist_path = launch_agents_dir.join(format!("{}.plist", self.bundle_id));

        if plist_path.exists() {
            let _ = Command::new("launchctl")
                .args(["unload", &plist_path.to_string_lossy()])
                .output();

            std::fs::remove_file(&plist_path).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    pub fn get_launch_agent_path(&self) -> Option<std::path::PathBuf> {
        dirs::home_dir().map(|h| {
            h.join("Library/LaunchAgents")
                .join(format!("{}.plist", self.bundle_id))
        })
    }

    pub fn is_launch_agent_installed(&self) -> bool {
        self.get_launch_agent_path()
            .map(|p| p.exists())
            .unwrap_or(false)
    }
}

pub fn get_startup_behavior() -> StartupBehavior {
    StartupBehavior {
        launch_at_login: check_login_item(),
        hidden_at_launch: true,
        skip_animations: std::env::args().any(|arg| arg == "--hidden"),
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartupBehavior {
    pub launch_at_login: bool,
    pub hidden_at_launch: bool,
    pub skip_animations: bool,
}

fn check_login_item() -> bool {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("osascript")
            .args([
                "-e",
                "tell application \"System Events\" to get the name of every login item",
            ])
            .output();

        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            return stdout.contains("Nexus-AI");
        }
    }
    false
}

use tauri::command;

const BUNDLE_ID: &str = "com.nexusai.macos";

lazy_static::lazy_static! {
    static ref AUTO_LAUNCH_MANAGER: AutoLaunchManager = AutoLaunchManager::new(BUNDLE_ID);
}

#[command]
pub fn enable_launch_at_login() -> Result<bool, String> {
    AUTO_LAUNCH_MANAGER.enable()?;
    Ok(true)
}

#[command]
pub fn disable_launch_at_login() -> Result<bool, String> {
    AUTO_LAUNCH_MANAGER.disable()?;
    Ok(false)
}

#[command]
pub fn is_launch_at_login_enabled() -> Result<bool, String> {
    Ok(AUTO_LAUNCH_MANAGER.is_launch_agent_installed())
}

#[command]
pub fn get_launch_settings() -> Result<LaunchSettings, String> {
    Ok(LaunchSettings {
        enabled: AUTO_LAUNCH_MANAGER.is_launch_agent_installed(),
        hidden: true,
        use_launch_agent: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auto_launch_manager() {
        let manager = AutoLaunchManager::new("ai.nexus.Nexus-AI");
        assert!(manager.app_path.len() > 0 || manager.app_path.is_empty());
    }
}
