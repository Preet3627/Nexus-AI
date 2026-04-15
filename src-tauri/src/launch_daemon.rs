use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

const DAEMON_LABEL: &str = "ai.nexus.NexusAI.Bridge";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LaunchDaemonConfig {
    pub label: String,
    pub program_path: String,
    pub run_at_load: bool,
    pub keep_alive: bool,
    pub standard_out_path: String,
    pub standard_error_path: String,
    pub environment_variables: std::collections::HashMap<String, String>,
}

impl Default for LaunchDaemonConfig {
    fn default() -> Self {
        Self {
            label: DAEMON_LABEL.to_string(),
            program_path: String::new(),
            run_at_load: true,
            keep_alive: false,
            standard_out_path: "/tmp/nexus-ai-daemon.log".to_string(),
            standard_error_path: "/tmp/nexus-ai-daemon.err".to_string(),
            environment_variables: std::collections::HashMap::new(),
        }
    }
}

pub struct LaunchDaemonManager {
    config: LaunchDaemonConfig,
}

impl LaunchDaemonManager {
    pub fn new() -> Self {
        let program_path = std::env::current_executable()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        Self {
            config: LaunchDaemonConfig {
                program_path,
                ..Default::default()
            },
        }
    }

    pub fn get_plist_path(&self) -> PathBuf {
        PathBuf::from(format!(
            "/Library/LaunchDaemons/{}.plist",
            self.config.label
        ))
    }

    pub fn get_user_plist_path(&self) -> PathBuf {
        dirs::home_dir()
            .map(|h| h.join("Library/LaunchAgents").join(format!("{}.plist", self.config.label)))
            .unwrap_or_default()
    }

    pub fn is_installed(&self) -> bool {
        self.get_plist_path().exists() || self.get_user_plist_path().exists()
    }

    pub fn is_running(&self) -> Result<bool, String> {
        let output = Command::new("launchctl")
            .args(["list", &self.config.label])
            .output()
            .map_err(|e| e.to_string())?;

        Ok(output.status.success())
    }

    pub fn install(&self) -> Result<(), String> {
        let plist_path = self.get_plist_path();
        let plist_dir = plist_path.parent().ok_or("Invalid path")?;

        std::fs::create_dir_all(plist_dir)
            .map_err(|e| format!("Failed to create directory: {}", e))?;

        let plist_content = self.generate_plist();

        std::fs::write(&plist_path, plist_content)
            .map_err(|e| format!("Failed to write plist: {}", e))?;

        let output = Command::new("launchctl")
            .args(["load", &plist_path.to_string_lossy()])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to load daemon: {}", stderr));
        }

        Ok(())
    }

    pub fn uninstall(&self) -> Result<(), String> {
        let plist_path = self.get_plist_path();

        if plist_path.exists() {
            let _ = Command::new("launchctl")
                .args(["unload", &plist_path.to_string_lossy()])
                .output();

            std::fs::remove_file(&plist_path)
                .map_err(|e| format!("Failed to remove plist: {}", e))?;
        }

        let user_plist_path = self.get_user_plist_path();
        if user_plist_path.exists() {
            let _ = Command::new("launchctl")
                .args(["unload", &user_plist_path.to_string_lossy()])
                .output();

            std::fs::remove_file(&user_plist_path)
                .map_err(|e| format!("Failed to remove user plist: {}", e))?;
        }

        Ok(())
    }

    pub fn start(&self) -> Result<(), String> {
        let output = Command::new("launchctl")
            .args(["start", &self.config.label])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to start daemon: {}", stderr));
        }

        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        let output = Command::new("launchctl")
            .args(["stop", &self.config.label])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to stop daemon: {}", stderr));
        }

        Ok(())
    }

    pub fn restart(&self) -> Result<(), String> {
        self.stop()?;
        self.start()
    }

    pub fn get_status(&self) -> DaemonStatus {
        DaemonStatus {
            installed: self.is_installed(),
            running: self.is_running().unwrap_or(false),
            label: self.config.label.clone(),
        }
    }

    fn generate_plist(&self) -> String {
        let mut env_vars = String::new();
        for (key, value) in &self.config.environment_variables {
            env_vars.push_str(&format!(
                "        <key>{}</key>\n        <string>{}</string>\n",
                key, value
            ));
        }

        format!(r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{}</string>
        <string>--daemon-mode</string>
    </array>
    <key>RunAtLoad</key>
    <{} />
    <key>KeepAlive</key>
    <{} />
    <key>StandardOutPath</key>
    <string>{}</string>
    <key>StandardErrorPath</key>
    <string>{}</string>
    <key>ProcessType</key>
    <string>Background</string>
    <key>LowPriorityIO</key>
    <true/>
    <key>EnvironmentVariables</key>
    <dict>
{}
    </dict>
</dict>
</plist>"#,
            self.config.label,
            self.config.program_path,
            if self.config.run_at_load { "true" } else { "false" },
            if self.config.keep_alive { "true" } else { "false" },
            self.config.standard_out_path,
            self.config.standard_error_path,
            env_vars.trim_end()
        )
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DaemonStatus {
    pub installed: bool,
    pub running: bool,
    pub label: String,
}

pub fn check_root_permissions() -> bool {
    let output = Command::new("id")
        .args(["-u"])
        .output();

    match output {
        Ok(o) => {
            let uid = String::from_utf8_lossy(&o.stdout);
            uid.trim() == "0"
        }
        Err(_) => false,
    }
}

pub fn request_admin_install() -> Result<(), String> {
    let output = Command::new("osascript")
        .args([
            "-e",
            r#"do shell script "echo Admin privileges required" with administrator privileges"#
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Administrator privileges required".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_launch_daemon_manager() {
        let manager = LaunchDaemonManager::new();
        assert_eq!(manager.config.label, DAEMON_LABEL);
    }

    #[test]
    fn test_plist_generation() {
        let manager = LaunchDaemonManager::new();
        let plist = manager.generate_plist();
        assert!(plist.contains("ai.nexus.NexusAI.Bridge"));
    }
}
