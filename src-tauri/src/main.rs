// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod llm;
mod security;

use commands::{capture_screen, get_settings, save_settings, send_message, authenticate, get_screenshot};
use llm::{chat, stream_chat};
use security::{check_permissions, request_permission};
use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder},
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            send_message,
            capture_screen,
            authenticate,
            get_settings,
            save_settings,
            get_screenshot,
            chat,
            stream_chat,
            check_permissions,
            request_permission,
        ])
        .setup(|app| {
            // Create the menu
            let app_handle = app.handle();
            
            let quit = MenuItem::with_id(app, "quit", "Quit Nexus-AI", true, Some("Cmd+q"))?;
            let show = MenuItem::with_id(app, "show", "Show Window", true, Some("Cmd+Shift+N"))?;
            let hide = MenuItem::with_id(app, "hide", "Hide Window", true, Some("Cmd+h"))?;
            let settings = MenuItem::with_id(app, "settings", "Settings...", true, Some("Cmd+,"))?;
            
            let menu = Menu::with_items(app, &[&show, &hide, &settings, &quit])?;
            
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Nexus-AI")
                .on_menu_event(move |app, event| {
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
                        "settings" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.eval("document.getElementById('settingsBtn')?.click()");
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
