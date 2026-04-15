use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use serde::{Deserialize, Serialize};
use tauri::command;

pub struct ScreenshotManager {
    last_screenshot_path: Mutex<Option<PathBuf>>,
}

impl ScreenshotManager {
    pub fn new() -> Self {
        Self {
            last_screenshot_path: Mutex::new(None),
        }
    }

    pub fn take_full_screenshot(&self) -> Result<PathBuf, String> {
        let timestamp = chrono_lite_timestamp();
        let path = PathBuf::from(format!(
            "/tmp/nexus-screenshot-{}.png",
            timestamp
        ));

        let output = Command::new("screencapture")
            .args(["-x", &path.to_string_lossy()])
            .output()
            .map_err(|e| format!("Failed to execute screencapture: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "screencapture failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        if !path.exists() {
            return Err("Screenshot file was not created".to_string());
        }

        *self.last_screenshot_path.lock().unwrap() = Some(path.clone());
        Ok(path)
    }

    pub fn take_region_screenshot(&self, x: i32, y: i32, width: i32, height: i32) -> Result<PathBuf, String> {
        let timestamp = chrono_lite_timestamp();
        let path = PathBuf::from(format!(
            "/tmp/nexus-screenshot-region-{}.png",
            timestamp
        ));

        let output = Command::new("screencapture")
            .args([
                "-x",
                "-R",
                &format!("{},{},{},{}", x, y, width, height),
                &path.to_string_lossy(),
            ])
            .output()
            .map_err(|e| format!("Failed to execute screencapture: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "screencapture failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        if !path.exists() {
            return Err("Screenshot file was not created".to_string());
        }

        *self.last_screenshot_path.lock().unwrap() = Some(path.clone());
        Ok(path)
    }

    pub fn take_window_screenshot(&self, window_id: u32) -> Result<PathBuf, String> {
        let timestamp = chrono_lite_timestamp();
        let path = PathBuf::from(format!(
            "/tmp/nexus-screenshot-window-{}.png",
            timestamp
        ));

        let output = Command::new("screencapture")
            .args([
                "-x",
                "-w",
                &window_id.to_string(),
                &path.to_string_lossy(),
            ])
            .output()
            .map_err(|e| format!("Failed to execute screencapture: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "screencapture failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        if !path.exists() {
            return Err("Screenshot file was not created".to_string());
        }

        *self.last_screenshot_path.lock().unwrap() = Some(path.clone());
        Ok(path)
    }

    pub fn get_screenshot_base64(&self, path: &PathBuf) -> Result<String, String> {
        let data = std::fs::read(path)
            .map_err(|e| format!("Failed to read screenshot: {}", e))?;

        Ok(BASE64.encode(&data))
    }

    pub fn get_last_screenshot(&self) -> Option<PathBuf> {
        self.last_screenshot_path.lock().unwrap().clone()
    }

    pub fn cleanup_old_screenshots(&self, max_age_hours: u64) -> Result<u32, String> {
        let temp_dir = PathBuf::from("/tmp");
        let prefix = "nexus-screenshot";

        let cutoff = std::time::SystemTime::now()
            .checked_sub(std::time::Duration::from_secs(max_age_hours * 3600))
            .ok_or("Time calculation error")?;

        let mut removed_count = 0u32;

        if let Ok(entries) = std::fs::read_dir(temp_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.starts_with(prefix) && name.ends_with(".png") {
                        if let Ok(modified) = entry.metadata().and_then(|m| m.modified()) {
                            if modified < cutoff {
                                if std::fs::remove_file(&path).is_ok() {
                                    removed_count += 1;
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(removed_count)
    }
}

fn chrono_lite_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap();

    let secs = now.as_secs();
    let millis = now.subsec_millis();

    format!("{}-{}", secs, millis)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenshotResult {
    pub path: String,
    pub base64: String,
    pub width: u32,
    pub height: u32,
    pub size_bytes: usize,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScreenRegion {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

#[command]
pub fn capture_screen(
    state: tauri::State<'_, ScreenshotManager>,
    region: Option<ScreenRegion>,
) -> Result<ScreenshotResult, String> {
    let path = match region {
        Some(r) => state.take_region_screenshot(r.x, r.y, r.width, r.height)?,
        None => state.take_full_screenshot()?,
    };

    let base64 = state.get_screenshot_base64(&path)?;

    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;

    let (width, height) = get_image_dimensions(&path)?;

    let timestamp = chrono_lite_timestamp();

    Ok(ScreenshotResult {
        path: path.to_string_lossy().to_string(),
        base64,
        width,
        height,
        size_bytes: metadata.len() as usize,
        timestamp,
    })
}

#[command]
pub fn capture_region(
    state: tauri::State<'_, ScreenshotManager>,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<ScreenshotResult, String> {
    let path = state.take_region_screenshot(x, y, width, height)?;
    let base64 = state.get_screenshot_base64(&path)?;

    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;

    let (img_width, img_height) = get_image_dimensions(&path)?;

    let timestamp = chrono_lite_timestamp();

    Ok(ScreenshotResult {
        path: path.to_string_lossy().to_string(),
        base64,
        width: img_width,
        height: img_height,
        size_bytes: metadata.len() as usize,
        timestamp,
    })
}

#[command]
pub fn get_last_screenshot_base64(
    state: tauri::State<'_, ScreenshotManager>,
) -> Result<String, String> {
    let path = state.get_last_screenshot()
        .ok_or("No screenshot available")?;

    state.get_screenshot_base64(&path)
}

#[command]
pub fn cleanup_screenshots(
    state: tauri::State<'_, ScreenshotManager>,
    max_age_hours: Option<u64>,
) -> Result<u32, String> {
    state.cleanup_old_screenshots(max_age_hours.unwrap_or(24))
}

fn get_image_dimensions(path: &PathBuf) -> Result<(u32, u32), String> {
    use std::process::Command;

    let output = Command::new("sips")
        .args(["-g", "pixelWidth", "-g", "pixelHeight", &path.to_string_lossy()])
        .output()
        .map_err(|e| format!("Failed to get image dimensions: {}", e))?;

    if !output.status.success() {
        return Err("sips command failed".to_string());
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    let mut width: u32 = 0;
    let mut height: u32 = 0;

    for line in output_str.lines() {
        if line.contains("pixelWidth") {
            if let Some(val) = line.split_whitespace().last() {
                width = val.parse().unwrap_or(0);
            }
        } else if line.contains("pixelHeight") {
            if let Some(val) = line.split_whitespace().last() {
                height = val.parse().unwrap_or(0);
            }
        }
    }

    Ok((width, height))
}

pub fn list_available_displays() -> Result<Vec<DisplayInfo>, String> {
    use std::process::Command;

    let output = Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
        .map_err(|e| format!("Failed to get displays: {}", e))?;

    if !output.status.success() {
        return Err("system_profiler failed".to_string());
    }

    let json_str = String::from_utf8_lossy(&output.stdout);

    let displays: Vec<DisplayInfo> = serde_json::from_str(&json_str)
        .unwrap_or_else(|_| {
            vec![DisplayInfo {
                id: 0,
                name: "Main Display".to_string(),
                width: 1920,
                height: 1080,
                is_main: true,
            }]
        });

    Ok(displays)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub id: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub is_main: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timestamp_format() {
        let ts = chrono_lite_timestamp();
        assert!(ts.contains("-"));
    }
}
