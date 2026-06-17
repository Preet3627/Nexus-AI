use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

pub const TRAY_ID: &str = "nexus-menu-bar";

const TOUCH_ID_HELPER_FILE: &str = "TouchIDVerify.swift";
const MAX_COMMAND_OUTPUT_CHARS: usize = 8_000;

#[derive(Debug, Serialize)]
pub struct ShellCommandResult {
    pub command: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub succeeded: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TouchIDVerification {
    pub verified: bool,
    pub biometry: String,
    pub message: String,
}

fn ensure_app_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn truncate_for_chat(output: String) -> String {
    let mut trimmed = output.trim().to_string();
    if trimmed.chars().count() > MAX_COMMAND_OUTPUT_CHARS {
        trimmed = trimmed.chars().take(MAX_COMMAND_OUTPUT_CHARS).collect();
        trimmed.push_str("\n…output truncated");
    }
    trimmed
}

fn open_with_macos(target: &str) -> Result<(), String> {
    let url_like = target.starts_with("http://")
        || target.starts_with("https://")
        || target.starts_with("mailto:")
        || target.starts_with("file://");

    let path_like = PathBuf::from(target).exists();

    let status = if url_like || path_like {
        Command::new("open")
            .arg(target)
            .status()
            .map_err(|e| e.to_string())?
    } else {
        Command::new("open")
            .args(["-a", target])
            .status()
            .map_err(|e| e.to_string())?
    };

    if status.success() {
        Ok(())
    } else {
        Err(format!("macOS could not open `{target}`."))
    }
}

fn ensure_touch_id_helper(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let helper_dir = ensure_app_dir(app_handle)?.join("swift");
    fs::create_dir_all(&helper_dir).map_err(|e| e.to_string())?;
    let helper_path = helper_dir.join(TOUCH_ID_HELPER_FILE);
    fs::write(&helper_path, include_str!("../swift/TouchIDVerify.swift"))
        .map_err(|e| e.to_string())?;
    Ok(helper_path)
}

fn normalize_music_provider(provider: &str) -> &'static str {
    match provider.trim().to_lowercase().as_str() {
        "apple" | "apple-music" | "apple_music" | "music" | "itunes" => "apple-music",
        "spotify" => "spotify",
        _ => "youtube",
    }
}

fn build_music_target(query: &str, provider: &str) -> Result<String, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err("Provide a song title after /play.".to_string());
    }

    match normalize_music_provider(provider) {
        "spotify" => Ok(format!(
            "https://open.spotify.com/search/{}",
            urlencoding::encode(trimmed)
        )),
        "apple-music" => {
            let mut url = reqwest::Url::parse("https://music.apple.com/us/search")
                .map_err(|e| e.to_string())?;
            url.query_pairs_mut().append_pair("term", trimmed);
            Ok(url.to_string())
        }
        _ => {
            let mut url = reqwest::Url::parse("https://www.youtube.com/results")
                .map_err(|e| e.to_string())?;
            url.query_pairs_mut().append_pair("search_query", trimmed);
            Ok(url.to_string())
        }
    }
}

async fn click_first_youtube_result() -> Result<bool, String> {
    const CLICK_SCRIPT: &str = r#"
(() => {
  const selectors = [
    'ytd-video-renderer a#thumbnail',
    'ytd-video-renderer a#video-title',
    'ytd-rich-item-renderer ytd-video-renderer a#thumbnail',
    'a.yt-simple-endpoint.style-scope.ytd-video-renderer'
  ];

  for (const selector of selectors) {
    const candidate = document.querySelector(selector);
    if (candidate instanceof HTMLElement) {
      candidate.click();
      return 'clicked';
    }
  }

  return document.readyState === 'complete' ? 'not-found' : 'loading';
})()
"#;

    for _ in 0..12 {
        let result = crate::comet::comet_execute_script(CLICK_SCRIPT.to_string()).await?;
        let normalized = result.trim().to_lowercase();
        if normalized.contains("clicked") {
            return Ok(true);
        }
        std::thread::sleep(Duration::from_millis(900));
    }

    Ok(false)
}

#[tauri::command]
pub fn get_app_preferences(app_handle: tauri::AppHandle) -> crate::settings::AppSettings {
    crate::settings::load_from_app_handle(&app_handle)
}

pub fn set_menu_bar_icon_visible_internal(
    app_handle: &tauri::AppHandle,
    visible: bool,
) -> Result<bool, String> {
    let db = app_handle.state::<crate::history::Database>();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let mut settings = crate::settings::load_from_connection(&conn)?;
    settings.menu_bar_icon_visible = visible;
    crate::settings::save_to_connection(&conn, &settings)?;

    if let Some(tray) = app_handle.tray_by_id(TRAY_ID) {
        tray.set_visible(visible).map_err(|e| e.to_string())?;
    }

    Ok(visible)
}

#[tauri::command]
pub fn set_menu_bar_icon_visible(
    app_handle: tauri::AppHandle,
    visible: bool,
) -> Result<bool, String> {
    set_menu_bar_icon_visible_internal(&app_handle, visible)
}

#[tauri::command]
pub fn search_web(query: String) -> Result<String, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err("Provide a query after /web.".to_string());
    }

    let mut url =
        reqwest::Url::parse("https://www.google.com/search").map_err(|e| e.to_string())?;
    url.query_pairs_mut().append_pair("q", trimmed);
    open_with_macos(url.as_str())?;

    Ok(format!(
        "Opened a web search for “{trimmed}” in your default browser."
    ))
}

#[tauri::command]
pub fn open_target(target: String) -> Result<String, String> {
    let trimmed = target.trim();
    if trimmed.is_empty() {
        return Err("Provide a URL, path, or app name after /open.".to_string());
    }

    open_with_macos(trimmed)?;
    Ok(format!("Opened `{trimmed}` with macOS."))
}

#[tauri::command]
pub async fn play_song(
    app_handle: tauri::AppHandle,
    query: String,
    provider: Option<String>,
) -> Result<String, String> {
    let settings = crate::settings::load_from_app_handle(&app_handle);
    let provider_name = provider
        .as_deref()
        .map(normalize_music_provider)
        .unwrap_or_else(|| normalize_music_provider(&settings.music_provider));
    let target = build_music_target(&query, provider_name)?;

    if provider_name == "youtube" {
        let launch_result =
            crate::comet::comet_launch_and_connect(Some(crate::comet::CometLaunchOptions {
                target: settings.comet_app_target.clone(),
                host: Some(settings.comet_host.clone()),
                port: Some(settings.comet_port),
                url: Some(target.clone()),
                wait_ms: Some(2_000),
            }))
            .await;

        if let Err(error) = launch_result {
            open_with_macos(&target)?;
            return Ok(format!(
                "Comet-AI was unavailable ({error}), so Nexus opened YouTube search for “{}” in your default browser instead.",
                query.trim()
            ));
        }

        if click_first_youtube_result().await? {
            return Ok(format!(
                "Asked Nexus to play “{}” on YouTube in Comet-AI and opened the first video automatically.",
                query.trim()
            ));
        }

        return Ok(format!(
            "Opened YouTube search for “{}” in Comet-AI, but the first result was not clickable automatically yet.",
            query.trim()
        ));
    }

    open_with_macos(&target)?;
    Ok(format!(
        "Opened {} search for “{}”.",
        match provider_name {
            "spotify" => "Spotify",
            "apple-music" => "Apple Music",
            _ => "YouTube",
        },
        query.trim()
    ))
}

#[tauri::command]
pub fn run_shell_command(command: String) -> Result<ShellCommandResult, String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("Provide a shell command after /shell.".to_string());
    }

    let output = Command::new("/bin/zsh")
        .args(["-lc", trimmed])
        .output()
        .map_err(|e| e.to_string())?;

    Ok(ShellCommandResult {
        command: trimmed.to_string(),
        stdout: truncate_for_chat(String::from_utf8_lossy(&output.stdout).into_owned()),
        stderr: truncate_for_chat(String::from_utf8_lossy(&output.stderr).into_owned()),
        exit_code: output.status.code(),
        succeeded: output.status.success(),
    })
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn set_output_volume(level: u8) -> Result<String, String> {
    let clamped = level.min(100);
    let script = format!("set volume output volume {clamped}");
    let status = Command::new("osascript")
        .args(["-e", &script])
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("macOS rejected the volume change.".to_string());
    }

    Ok(format!("Set the macOS output volume to {clamped}%."))
}

#[tauri::command]
pub fn show_native_alert(title: String, message: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "display alert \"{}\" message \"{}\" as warning",
            title.replace("\"", "\\\""),
            message.replace("\"", "\\\"")
        );
        Command::new("osascript")
            .args(["-e", &script])
            .status()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn set_output_volume(_level: u8) -> Result<String, String> {
    Err("Output volume control is only available on macOS.".to_string())
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn verify_touch_id(
    app_handle: tauri::AppHandle,
    reason: Option<String>,
) -> Result<TouchIDVerification, String> {
    let helper_path = ensure_touch_id_helper(&app_handle)?;
    let prompt = reason
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "Authenticate to continue in Nexus AI.".to_string());

    let output = Command::new("/usr/bin/swift")
        .arg(helper_path)
        .arg(prompt)
        .output()
        .map_err(|e| format!("Swift toolchain is required for Touch ID verification: {e}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    serde_json::from_slice::<TouchIDVerification>(&output.stdout)
        .map_err(|e| format!("Could not decode Touch ID verification result: {e}"))
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn verify_touch_id(
    _app_handle: tauri::AppHandle,
    _reason: Option<String>,
) -> Result<TouchIDVerification, String> {
    Err("Touch ID verification is only available on macOS.".to_string())
}

#[cfg(test)]
mod tests {
    use super::{build_music_target, normalize_music_provider};

    #[test]
    fn normalizes_music_provider_aliases() {
        assert_eq!(normalize_music_provider("spotify"), "spotify");
        assert_eq!(normalize_music_provider("apple"), "apple-music");
        assert_eq!(normalize_music_provider("music"), "apple-music");
        assert_eq!(normalize_music_provider("yt"), "youtube");
    }

    #[test]
    fn builds_expected_music_targets() {
        assert_eq!(
            build_music_target("Hum Pyaar", "spotify").unwrap(),
            "https://open.spotify.com/search/Hum%20Pyaar"
        );
        assert_eq!(
            build_music_target("Hum Pyaar", "youtube").unwrap(),
            "https://www.youtube.com/results?search_query=Hum+Pyaar"
        );
        assert_eq!(
            build_music_target("Hum Pyaar", "apple-music").unwrap(),
            "https://music.apple.com/us/search?term=Hum+Pyaar"
        );
    }
}
