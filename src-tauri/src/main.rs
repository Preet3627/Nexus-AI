// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod llm;
mod security;
mod comet;
mod tray;
mod overlay;
mod screenshot;
mod auto_launch;

use overlay::OverlayState;
use auto_launch::{AutoLaunchManager, get_startup_behavior, LaunchSettings};

use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    State,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use screenshot::ScreenshotManager;

fn main() {
    let startup_behavior = get_startup_behavior();

    if startup_behavior.skip_animations {
        tracing::info!("Starting Nexus-AI in hidden mode (auto-launch)");
    } else {
        tracing::info!("Starting Nexus-AI");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(ScreenshotManager::new())
        .manage(OverlayState::default())
        .setup(move |app| {
            let is_hidden_startup = startup_behavior.skip_animations;

            if is_hidden_startup {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
                tracing::info!("App started hidden (auto-launch mode)");
            }

            let quit = MenuItem::with_id(app, "quit", "Quit Nexus-AI", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Nexus-AI - Press ⌃⌃ to toggle")
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => {
                            tracing::info!("Quit requested from tray");
                            app.exit(0);
                        }
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            tracing::info!("Tray icon created");

            #[cfg(target_os = "macos")]
            {
                setup_hotkey_handler(app)?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::send_message,
            commands::capture_screen,
            commands::authenticate,
            commands::get_settings,
            commands::save_settings,
            commands::get_screenshot,
            llm::chat,
            llm::stream_chat,
            security::check_permissions,
            security::request_permission,
            comet::connect,
            comet::disconnect,
            comet::execute_action,
            overlay::toggle_overlay,
            overlay::show_overlay,
            overlay::hide_overlay,
            screenshot::capture_screen,
            screenshot::capture_region,
            screenshot::get_last_screenshot_base64,
            screenshot::cleanup_screenshots,
            auto_launch::enable_launch_at_login,
            auto_launch::disable_launch_at_login,
            auto_launch::is_launch_at_login_enabled,
            auto_launch::get_launch_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(target_os = "macos")]
fn setup_hotkey_handler(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("Setting up double-tap Control hotkey handler");
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn setup_hotkey_handler(_app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    Ok(())
}
