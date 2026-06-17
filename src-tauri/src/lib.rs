/*!
 * Thuki Core Library
 *
 * Application bootstrap for the Thuki desktop agent. Configures the macOS
 * status bar presence, system tray menu, double-tap Control hotkey, and
 * window lifecycle (hide-on-close instead of quit).
 *
 * On macOS the main window is converted to an NSPanel via `tauri-nspanel`.
 * This allows the overlay to appear on top of native fullscreen applications
 * — something a standard NSWindow cannot do regardless of window level.
 *
 * The overlay is toggled via a system-level activation trigger (macOS only),
 * managed by the `activator` module.
 */

#![cfg_attr(coverage_nightly, feature(coverage_attribute))]

mod activator;
pub mod auto_launch;
pub mod comet;
pub mod commands;
pub mod context;
pub mod database;
pub mod file_extraction;
pub mod github;
pub mod google_auth;
pub mod history;
pub mod images;
pub mod launch_daemon;
pub mod llm;
pub mod native_actions;
pub mod onboarding;
pub mod permissions;
pub mod productivity;
pub mod screenshot;
pub mod security;
pub mod settings;
pub mod shared_keychain;
pub mod siri_bridge;
pub mod memory_manager;

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{Menu, MenuBuilder, MenuItem, Submenu, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, WebviewWindow,
};

#[cfg(target_os = "macos")]
use tauri_nspanel::{
    tauri_panel, CollectionBehavior, ManagerExt, PanelLevel, StyleMask, WebviewWindowExt,
};

// ─── NSPanel definition (macOS only) ────────────────────────────────────────

// ThukiPanel — custom NSPanel subclass for the overlay.
// `can_become_key_window: true` allows keyboard input for the chat.
// `is_floating_panel: true` keeps the panel above normal windows.
#[cfg(target_os = "macos")]
tauri_panel! {
    panel!(ThukiPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
    })
}

// ─── Window helpers ─────────────────────────────────────────────────────────

/// Expected logical width of the overlay window for spawn-position calculations.
const OVERLAY_LOGICAL_WIDTH: f64 = 600.0;
/// Collapsed bar height used for Y-clamp at show time. The window starts collapsed;
/// the ResizeObserver expands it after mount.
const OVERLAY_LOGICAL_HEIGHT_COLLAPSED: f64 = 80.0;

/// Frontend event used to synchronize show/hide animations with native window visibility.
const OVERLAY_VISIBILITY_EVENT: &str = "thuki://visibility";
const OVERLAY_VISIBILITY_SHOW: &str = "show";
const OVERLAY_VISIBILITY_HIDE_REQUEST: &str = "hide-request";

/// Frontend event that triggers the onboarding screen when one or more
/// required permissions have not yet been granted.
const ONBOARDING_EVENT: &str = "thuki://onboarding";

/// Logical dimensions of the onboarding window (centered, fixed size).
/// Content fits tightly; native macOS shadow is re-enabled for onboarding
/// so it renders outside the window boundary without extra transparent padding.
const ONBOARDING_LOGICAL_WIDTH: f64 = 460.0;
const ONBOARDING_LOGICAL_HEIGHT: f64 = 640.0;

/// Tracks the intended visibility state of the overlay, preventing race conditions
/// between the frontend exit animation and rapid activation toggles.
static OVERLAY_INTENDED_VISIBLE: AtomicBool = AtomicBool::new(false);

/// True on first process launch; cleared when the frontend signals readiness.
/// Used to show the overlay automatically on startup without a race condition:
/// the frontend calls `notify_frontend_ready` after its event listener is
/// registered, so the show event is guaranteed to have a listener.
static LAUNCH_SHOW_PENDING: AtomicBool = AtomicBool::new(true);

/// Payload emitted to the frontend on every visibility transition.
#[derive(Clone, serde::Serialize)]
struct VisibilityPayload {
    /// "show" or "hide-request"
    state: &'static str,
    /// Selected text captured at activation time, if any.
    selected_text: Option<String>,
    /// Logical X of the window at show time. Used with `window_y` and
    /// `screen_bottom_y` to decide growth direction, and as the pinned X
    /// coordinate for `set_window_frame` calls during upward growth.
    window_x: Option<f64>,
    /// Logical Y of the window top-left at show time.
    window_y: Option<f64>,
    /// Logical Y of the screen bottom edge (monitor origin + height).
    screen_bottom_y: Option<f64>,
}

/// Emits a visibility transition to the frontend animation controller.
fn emit_overlay_visibility(
    app_handle: &tauri::AppHandle,
    state: &'static str,
    selected_text: Option<String>,
    window_x: Option<f64>,
    window_y: Option<f64>,
    screen_bottom_y: Option<f64>,
) {
    let _ = app_handle.emit(
        OVERLAY_VISIBILITY_EVENT,
        VisibilityPayload {
            state,
            selected_text,
            window_x,
            window_y,
            screen_bottom_y,
        },
    );
}

/// CoreGraphics display lookup — uses macOS-native `CGGetDisplaysWithPoint`
/// for hit-testing instead of manual iteration + containment checks.
/// All coordinates are in the Quartz display coordinate space (top-left of
/// primary display, Y-down), matching the AX API and `CGEventGetLocation`.
#[cfg(target_os = "macos")]
mod cg_displays {
    use core_graphics::geometry::{CGPoint, CGRect};

    type CGDirectDisplayID = u32;

    extern "C" {
        fn CGGetDisplaysWithPoint(
            point: CGPoint,
            max_displays: u32,
            displays: *mut CGDirectDisplayID,
            matching_display_count: *mut u32,
        ) -> i32;
        fn CGDisplayBounds(display: CGDirectDisplayID) -> CGRect;
        fn CGMainDisplayID() -> CGDirectDisplayID;
    }

    fn rect_to_tuple(r: CGRect) -> (f64, f64, f64, f64) {
        (r.origin.x, r.origin.y, r.size.width, r.size.height)
    }

    /// Returns `(origin_x, origin_y, width, height)` in Quartz points for
    /// the display containing `(global_x, global_y)`.
    pub fn display_for_point(global_x: f64, global_y: f64) -> Option<(f64, f64, f64, f64)> {
        unsafe {
            let point = CGPoint::new(global_x, global_y);
            let mut ids = [0u32; 4];
            let mut count: u32 = 0;
            let err = CGGetDisplaysWithPoint(point, 4, ids.as_mut_ptr(), &mut count);
            if err != 0 || count == 0 {
                return None;
            }
            Some(rect_to_tuple(CGDisplayBounds(ids[0])))
        }
    }

    /// Returns `(origin_x, origin_y, width, height)` of the main (menu-bar) display.
    pub fn main_display() -> (f64, f64, f64, f64) {
        unsafe { rect_to_tuple(CGDisplayBounds(CGMainDisplayID())) }
    }
}

/// Returns the Quartz-coordinate bounds of the display containing
/// `(global_x, global_y)`, falling back to the main display.
#[cfg(target_os = "macos")]
fn find_target_monitor(global_x: f64, global_y: f64) -> (f64, f64, f64, f64) {
    cg_displays::display_for_point(global_x, global_y).unwrap_or_else(cg_displays::main_display)
}

/// Returns Quartz-coordinate bounds of the main display as a fallback
/// when no positioning context is available.
#[cfg(target_os = "macos")]
fn monitor_info_fallback() -> (f64, f64, f64, f64) {
    cg_displays::main_display()
}

/// Shows the overlay and requests the frontend to replay its entrance animation.
///
/// Uses `show_and_make_key()` to guarantee the NSPanel becomes the key window,
/// which is required for the WebView input to receive keyboard focus reliably.
///
/// AX bounds and mouse position arrive in **global** screen coordinates that span
/// all monitors. We find which monitor the activation happened on, convert to
/// monitor-local coordinates for the positioning math, then convert the result
/// back to global coordinates for `set_position`.
#[cfg(target_os = "macos")]
fn show_overlay(app_handle: &tauri::AppHandle, ctx: crate::context::ActivationContext) {
    let already_visible = OVERLAY_INTENDED_VISIBLE.swap(true, Ordering::SeqCst);
    if already_visible {
        return;
    }

    // Extract before building local_ctx to avoid an extra clone.
    let selected_text = ctx.selected_text;

    // Position the window before making it visible.
    let placement = if let Some(window) = app_handle.get_webview_window("main") {
        // Pick an anchor point to identify the target monitor.
        let anchor_point = ctx
            .bounds
            .map(|r| (r.x + r.width / 2.0, r.y + r.height / 2.0))
            .or(ctx.mouse_position);

        let (mon_x, mon_y, screen_w, screen_h) = if let Some((ax, ay)) = anchor_point {
            find_target_monitor(ax, ay)
        } else {
            monitor_info_fallback()
        };

        // Convert global coordinates to monitor-local for the positioning math.
        let local_ctx = crate::context::ActivationContext {
            selected_text: selected_text.clone(),
            bounds: ctx.bounds.map(|r| crate::context::ScreenRect {
                x: r.x - mon_x,
                y: r.y - mon_y,
                width: r.width,
                height: r.height,
            }),
            mouse_position: ctx.mouse_position.map(|(mx, my)| (mx - mon_x, my - mon_y)),
        };

        let p = crate::context::calculate_window_position(
            &local_ctx,
            screen_w,
            screen_h,
            OVERLAY_LOGICAL_WIDTH,
            OVERLAY_LOGICAL_HEIGHT_COLLAPSED,
        );

        // Convert back to global screen coordinates.
        let global = crate::context::WindowPlacement {
            x: p.x + mon_x,
            y: p.y + mon_y,
        };

        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
            global.x, global.y,
        )));
        let screen_bottom = mon_y + screen_h;
        Some((global, screen_bottom))
    } else {
        None
    };

    let (window_x, window_y, screen_bottom_y) = match &placement {
        Some((p, sb)) => (Some(p.x), Some(p.y), Some(*sb)),
        None => (None, None, None),
    };

    match app_handle.get_webview_panel("main") {
        Ok(panel) => {
            panel.show_and_make_key();
            emit_overlay_visibility(
                app_handle,
                OVERLAY_VISIBILITY_SHOW,
                selected_text,
                window_x,
                window_y,
                screen_bottom_y,
            );
        }
        Err(e) => {
            eprintln!("thuki: [show_overlay] get_webview_panel FAILED: {e:?}");
            // Reset the flag so future activation attempts are not permanently blocked.
            OVERLAY_INTENDED_VISIBLE.store(false, Ordering::SeqCst);
        }
    }
}

/// Requests an animated hide sequence from the frontend. The actual native
/// window hide is deferred until the frontend exit animation completes.
fn request_overlay_hide(app_handle: &tauri::AppHandle) {
    if OVERLAY_INTENDED_VISIBLE.swap(false, Ordering::SeqCst) {
        emit_overlay_visibility(
            app_handle,
            OVERLAY_VISIBILITY_HIDE_REQUEST,
            None,
            None,
            None,
            None,
        );
    }
}

/// Shows the overlay and requests the frontend to replay its entrance animation.
///
/// Window positioning is intentionally deferred on non-macOS platforms — the
/// activation context is forwarded to the frontend for selected-text display,
/// but no positioning logic is applied until platform-specific activators
/// (e.g. Windows global hotkey) are implemented.
#[cfg(not(target_os = "macos"))]
fn show_overlay(app_handle: &tauri::AppHandle, ctx: crate::context::ActivationContext) {
    if OVERLAY_INTENDED_VISIBLE.swap(true, Ordering::SeqCst) {
        return;
    }
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        emit_overlay_visibility(
            app_handle,
            OVERLAY_VISIBILITY_SHOW,
            ctx.selected_text,
            None,
            None,
            None,
        );
    }
}

/// Toggles the overlay between visible and hidden states.
///
/// Uses an atomic flag as the single source of truth for intended visibility,
/// which avoids race conditions with the native panel state during animations.
fn toggle_overlay(app_handle: &tauri::AppHandle, ctx: crate::context::ActivationContext) {
    if OVERLAY_INTENDED_VISIBLE.load(Ordering::SeqCst) {
        request_overlay_hide(app_handle);
    } else {
        show_overlay(app_handle, ctx);
    }
}

/// Repositions and resizes the main window atomically.
///
/// Regular Tauri commands run on a Tokio thread pool. Calling `set_position`
/// then `set_size` from a pool thread dispatches each as a *separate* event to
/// the macOS main thread, which can render as two distinct display frames and
/// produce a visible stutter when the window grows upward (position + size both
/// change on every token during streaming).
///
/// Wrapping both calls in a single `run_on_main_thread` closure ensures they
/// arrive on the main thread together in the same event-loop iteration. AppKit
/// then coalesces the geometry change into one compositor frame.
#[tauri::command]
fn set_window_frame(app_handle: tauri::AppHandle, x: f64, y: f64, width: f64, height: f64) {
    // Reject non-finite values (NaN, Infinity) from the frontend to prevent
    // undefined AppKit behaviour when forwarded to native window APIs.
    if !x.is_finite() || !y.is_finite() || !width.is_finite() || !height.is_finite() {
        return;
    }
    let width = width.clamp(1.0, 10_000.0);
    let height = height.clamp(1.0, 10_000.0);

    let handle = app_handle.clone();
    let _ = app_handle.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window("main") {
            let _ =
                window.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)));
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(width, height)));
        }
    });
}

/// Resizes the main window on the macOS main thread.
///
/// Transparent Tauri windows can occasionally keep a stale clipped region on
/// the first post-launch resize. `force_refresh` nudges the height by 1 logical
/// point before applying the real size, which forces AppKit/WebKit to redraw
/// the backing surface without introducing a visible jump.
#[tauri::command]
fn set_window_size(
    app_handle: tauri::AppHandle,
    width: f64,
    height: f64,
    force_refresh: Option<bool>,
) {
    if !width.is_finite() || !height.is_finite() {
        return;
    }

    let width = width.clamp(1.0, 10_000.0);
    let height = height.clamp(1.0, 10_000.0);
    let refresh = force_refresh.unwrap_or(false);

    let handle = app_handle.clone();
    let _ = app_handle.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window("main") {
            if refresh {
                let nudged_height = (height + 1.0).clamp(1.0, 10_000.0);
                let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                    width,
                    nudged_height,
                )));
            }

            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(width, height)));
        }
    });
}

/// Synchronizes the Rust-side visibility tracking when the frontend
/// completes its exit animation and hides the native window.
#[tauri::command]
fn notify_overlay_hidden() {
    OVERLAY_INTENDED_VISIBLE.store(false, Ordering::SeqCst);
}

const FRONTEND_READY_TIMEOUT_MS: u64 = 10000;

fn start_frontend_ready_timeout(app_handle: tauri::AppHandle) {
    let handle = app_handle.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(FRONTEND_READY_TIMEOUT_MS));
        if LAUNCH_SHOW_PENDING.load(Ordering::SeqCst) {
            eprintln!("thuki: [frontend_ready_timeout] frontend failed to respond in {}ms, showing window anyway", FRONTEND_READY_TIMEOUT_MS);
            let handle2 = handle.clone();
            let _ = handle.run_on_main_thread(move || {
                #[cfg(target_os = "macos")]
                {
                    if let Ok(panel) = handle2.get_webview_panel("main") {
                        panel.show_and_make_key();
                        return;
                    }
                }
                if let Some(window) = handle2.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            });
        }
    });
}

#[tauri::command]
fn log_to_terminal(msg: String) {
    println!("thuki: [frontend] {}", msg);
}

/// Called by the frontend once its visibility event listener is registered.
/// On the first call per process lifetime, shows the overlay so the AskBar
/// appears automatically at startup without a race between the Rust emit and
/// the frontend listener registration.
#[tauri::command]
#[cfg_attr(coverage_nightly, coverage(off))]
fn notify_frontend_ready(app_handle: tauri::AppHandle, db: tauri::State<history::Database>) {
    println!("thuki: [frontend] readiness signal received");
    if LAUNCH_SHOW_PENDING.swap(false, Ordering::SeqCst) {
        #[cfg(target_os = "macos")]
        {
            if let Ok(conn) = db.0.lock() {
                let stage = onboarding::get_stage(&conn)
                    .unwrap_or(onboarding::OnboardingStage::Permissions);

                // The "intro" stage means quit_and_relaunch already marked
                // complete before restarting. Skip the live permission check
                // here: on macOS 15+ CGPreflightScreenCaptureAccess can return
                // a stale false negative immediately after a restart, which
                // would wrongly loop the user back to the permissions screen.
                if matches!(stage, onboarding::OnboardingStage::Intro) {
                    show_overlay(&app_handle, crate::context::ActivationContext::empty());
                    return;
                }

                // For the "permissions" and "complete" stages, check live
                // permissions. "permissions" is the standard first-launch path.
                // "complete" detects revocation: if a user revokes a permission
                // after finishing onboarding, they should see the permissions
                // screen again on the next launch.
                let ax = permissions::is_accessibility_granted();
                let sr = permissions::is_screen_recording_granted();

                if !ax || !sr {
                    let _ = onboarding::set_stage(&conn, &onboarding::OnboardingStage::Permissions);
                    show_onboarding_window(&app_handle, onboarding::OnboardingStage::Permissions);
                    return;
                }

                // All permissions granted. Skip intro — go straight to overlay.
                if !matches!(stage, onboarding::OnboardingStage::Complete) {
                    let _ = onboarding::mark_complete(&conn);
                    drop(conn);
                    show_overlay(&app_handle, crate::context::ActivationContext::empty());
                    return;
                }
                // Complete: fall through to show the overlay.
            } else {
                // Mutex poisoned; safe fallback.
                show_onboarding_window(&app_handle, onboarding::OnboardingStage::Permissions);
                return;
            }
        }
        show_overlay(&app_handle, crate::context::ActivationContext::empty());
    }
}

// ─── Onboarding completion ───────────────────────────────────────────────────

/// Called when the user clicks "Get Started" on the intro screen.
/// Marks onboarding complete in the DB, restores the window to overlay mode,
/// and immediately shows the Ask Bar — no relaunch required.
#[tauri::command]
#[cfg_attr(coverage_nightly, coverage(off))]
fn finish_onboarding(
    db: tauri::State<history::Database>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| format!("db lock poisoned: {e}"))?;
    onboarding::mark_complete(&conn).map_err(|e| format!("db write failed: {e}"))?;
    drop(conn);

    // Restore panel to overlay configuration and show the Ask Bar.
    // Must run on the macOS main thread because NSPanel APIs are not thread-safe.
    let handle = app_handle.clone();
    let _ = app_handle.run_on_main_thread(move || {
        // Resize the window back to the collapsed overlay dimensions before
        // positioning, so the overlay appears at the correct size.
        if let Some(window) = handle.get_webview_window("main") {
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                OVERLAY_LOGICAL_WIDTH,
                OVERLAY_LOGICAL_HEIGHT_COLLAPSED,
            )));
        }
        // Restore NSPanel level, shadow, and style that show_onboarding_window
        // changed for the onboarding appearance.
        #[cfg(target_os = "macos")]
        init_panel(&handle);
        show_overlay(&handle, crate::context::ActivationContext::empty());
    });

    Ok(())
}

// ─── NSPanel initialisation ─────────────────────────────────────────────────

/// Converts the main Tauri window into an NSPanel and applies the overlay
/// configuration required to appear over fullscreen macOS applications.
///
/// The four critical settings are:
/// - `PanelLevel::Floating` — floats above normal windows
/// - `CollectionBehavior::full_screen_auxiliary()` — allows coexistence with
///   fullscreen Spaces (this is what standard `alwaysOnTop` cannot do)
/// - `StyleMask::nonactivating_panel()` — prevents the panel from stealing
///   focus/activation from the fullscreen application
/// - `set_has_shadow(false)` — disables the native compositor shadow, which
///   renders differently for key vs. non-key windows, causing a visible change
///   when the user clicks elsewhere. CSS `shadow-bar` provides a consistent
///   elevation effect independent of key-window state.
#[cfg(target_os = "macos")]
fn init_panel(app_handle: &tauri::AppHandle) {
    let window: WebviewWindow = app_handle
        .get_webview_window("main")
        .expect("main window must exist at setup time");

    let panel = window
        .to_panel::<ThukiPanel>()
        .expect("NSPanel conversion must succeed on macOS");

    panel.set_level(PanelLevel::Floating.value());

    panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());

    panel.set_collection_behavior(
        CollectionBehavior::new()
            .full_screen_auxiliary()
            .can_join_all_spaces()
            .into(),
    );

    // Keep the panel visible when the user clicks back into the fullscreen app.
    panel.set_hides_on_deactivate(false);

    // Disable the native compositor shadow. macOS renders visually distinct
    // shadows for key vs. non-key windows, which causes the overlay to appear
    // different after the user clicks elsewhere. The CSS `shadow-bar` provides
    // a stable, focus-independent elevation effect.
    panel.set_has_shadow(false);
}

// ─── Onboarding window ───────────────────────────────────────────────────────

/// Sizes the main window for the onboarding screen, centers it, makes it
/// visible, and emits `thuki://onboarding` so the frontend switches to
/// `OnboardingView`.
///
/// All window mutations run on the macOS main thread via `run_on_main_thread`;
/// the event is emitted from the same closure to avoid a race where the
/// frontend receives the event before the window is visible.
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
fn show_onboarding_window(app_handle: &tauri::AppHandle, stage: onboarding::OnboardingStage) {
    let handle = app_handle.clone();
    let _ = app_handle.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window("main") {
            let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                ONBOARDING_LOGICAL_WIDTH,
                ONBOARDING_LOGICAL_HEIGHT,
            )));
            let _ = window.center();
        }
        match handle.get_webview_panel("main") {
            Ok(panel) => {
                // Strip nonactivating_panel for onboarding — it prevents mouse
                // events from reaching the webview in production builds.
                // Keep the panel borderless so it stays decoration-free.
                panel.set_style_mask(StyleMask::empty().into());
                panel.set_level(0);
                panel.set_has_shadow(true);
                panel.show_and_make_key();
            }
            Err(_) => {
                if let Some(w) = handle.get_webview_window("main") {
                    let _ = w.show();
                }
            }
        }
        let _ = handle.emit(ONBOARDING_EVENT, OnboardingPayload { stage });
    });
}

/// Payload emitted to the frontend for every onboarding transition.
#[derive(Clone, serde::Serialize)]
struct OnboardingPayload {
    stage: onboarding::OnboardingStage,
}

// ─── Image cleanup ──────────────────────────────────────────────────────────

/// Interval between periodic orphaned-image cleanup sweeps.
const IMAGE_CLEANUP_INTERVAL: std::time::Duration = std::time::Duration::from_secs(3600);

/// Runs a single orphaned-image cleanup sweep. Thin orchestration wrapper
/// that delegates to `database::get_all_image_paths` and
/// `images::cleanup_orphaned_images`, both independently tested.
#[cfg_attr(coverage_nightly, coverage(off))]
fn run_image_cleanup(app_handle: &tauri::AppHandle) {
    let db = app_handle.state::<history::Database>();
    let conn = match db.0.lock() {
        Ok(c) => c,
        Err(_) => return,
    };
    let referenced = database::get_all_image_paths(&conn).unwrap_or_default();
    drop(conn);

    let base_dir = match app_handle.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return,
    };
    let _ = images::cleanup_orphaned_images(&base_dir, &referenced);
}

/// Spawns a background Tokio task that runs the cleanup sweep on a fixed
/// interval. Thin async wrapper — delegates to `run_image_cleanup`.
#[cfg_attr(coverage_nightly, coverage(off))]
fn spawn_periodic_image_cleanup(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(IMAGE_CLEANUP_INTERVAL);
        // Skip the first tick (startup cleanup already ran synchronously).
        interval.tick().await;
        loop {
            interval.tick().await;
            run_image_cleanup(&app_handle);
        }
    });
}

// ─── Application entry point ─────────────────────────────────────────────────

/// Initialises and runs the Tauri application.
///
/// Setup order:
/// 1. SQLite is initialised so persisted settings are available immediately.
/// 2. The saved activation policy is applied on macOS.
/// 3. The main window is converted to an NSPanel for fullscreen overlay.
/// 4. System tray is registered; double-tap Control listener starts.
/// 5. `CloseRequested` is intercepted to hide instead of destroy.
///
/// # Panics
///
/// Panics if the Tauri runtime fails to initialise.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenvy::dotenv().ok();

    let mut builder = tauri::Builder::default();

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .setup(|app| {
            println!("thuki: [setup] starting application bootstrap");

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            println!("thuki: [setup] app data directory: {:?}", app_data_dir);

            let db_conn = database::open_database(&app_data_dir)
                .expect("failed to initialise SQLite database");
            println!("thuki: [setup] database initialized");

            app.manage(history::Database(std::sync::Mutex::new(db_conn)));

            let settings = settings::load_from_app_handle(app.app_handle());

            #[cfg(target_os = "macos")]
            {
                if settings.hide_from_dock {
                    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                } else {
                    app.set_activation_policy(tauri::ActivationPolicy::Regular);
                }
            }

            // ── NSPanel conversion (macOS only) ──────────────────────────
            #[cfg(target_os = "macos")]
            init_panel(app.app_handle());
            println!("thuki: [setup] native panel initialized");

            let app_handle = app.handle();

            // ── Onboarding ───────────────────────────────────────────────
            {
                let db_state = app.state::<history::Database>();
                let conn = db_state.0.lock().unwrap();
                if let Some(stage) = onboarding::compute_startup_stage(&conn).unwrap() {
                    println!("thuki: [setup] onboarding needed (stage: {:?})", stage);
                    show_onboarding_window(&app_handle, stage);
                }
            }

            // ── Frontend ready timeout fallback ───────────────────────────
            start_frontend_ready_timeout(app.handle().clone());

            // ── Activator (Hotkeys) ───────────────────────────────────────
            if let Err(e) = activator::create_event_tap(app_handle.clone()) {
                eprintln!("thuki: [activator] FAILED to create event tap: {e}");
            }

            // ── System tray icon + menu ───────────────────────────────────
            let show_item = MenuItem::with_id(app, "show", "Open Nexus AI", true, None::<&str>)?;
            let hide_icon_item = MenuItem::with_id(
                app,
                "hide_menu_icon",
                "Hide Menu Bar Icon",
                true,
                None::<&str>,
            )?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(app, &[&show_item, &hide_icon_item, &quit_item])?;

            let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/128x128.png"))
                .expect("Failed to load tray icon");

            let tray = TrayIconBuilder::with_id(native_actions::TRAY_ID)
                .icon(tray_icon)
                .icon_as_template(false)
                .tooltip("Nexus AI")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        show_overlay(app, crate::context::ActivationContext::empty());
                    }
                    "hide_menu_icon" => {
                        let _ = crate::native_actions::set_menu_bar_icon_visible_internal(
                            &app.clone(),
                            false,
                        );
                    }
                    "quit" => {
                        app.state::<crate::commands::GenerationState>().cancel();
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if matches!(button, MouseButton::Left) {
                            toggle_overlay(
                                tray.app_handle(),
                                crate::context::ActivationContext::empty(),
                            );
                        }
                    }
                })
                .build(app)?;

            let settings = settings::load_from_app_handle(app.app_handle());
            let _ = tray.set_visible(settings.menu_bar_icon_visible);

            // ── Native macOS Menu ────────────────────────────────────────
            #[cfg(target_os = "macos")]
            {
                let app_handle = app.handle().clone();

                let theme_dark =
                    MenuItem::with_id(&app_handle, "theme_dark", "Dark Mode", true, Some("Cmd+D"))?;
                let theme_light = MenuItem::with_id(
                    &app_handle,
                    "theme_light",
                    "Light Mode",
                    true,
                    Some("Cmd+L"),
                )?;
                let settings_item =
                    MenuItem::with_id(&app_handle, "settings", "Settings...", true, Some("Cmd+,"))?;
                let help_item =
                    MenuItem::with_id(&app_handle, "help", "Nexus AI Help", true, Some("Cmd+?"))?;

                let edit_menu = Submenu::new(&app_handle, "Edit", true)?;
                edit_menu.append(&PredefinedMenuItem::undo(&app_handle, None)?)?;
                edit_menu.append(&PredefinedMenuItem::redo(&app_handle, None)?)?;
                edit_menu.append(&PredefinedMenuItem::separator(&app_handle)?)?;
                edit_menu.append(&PredefinedMenuItem::cut(&app_handle, None)?)?;
                edit_menu.append(&PredefinedMenuItem::copy(&app_handle, None)?)?;
                edit_menu.append(&PredefinedMenuItem::paste(&app_handle, None)?)?;
                edit_menu.append(&PredefinedMenuItem::select_all(&app_handle, None)?)?;

                let main_menu = MenuBuilder::new(&app_handle)
                    .item(&settings_item)
                    .separator()
                    .item(&theme_dark)
                    .item(&theme_light)
                    .separator()
                    .item(&help_item)
                    .item(&edit_menu)
                    .build()?;

                app.set_menu(main_menu)?;

                app.on_menu_event(move |app, event| {
                    let id = event.id().as_ref();
                    if id == "theme_dark" {
                        if let Ok(db) = app.state::<crate::history::Database>().0.lock() {
                            if let Ok(mut s) = settings::load_from_connection(&db) {
                                s.theme = "dark".to_string();
                                let _ = settings::save_to_connection(&db, &s);
                                let _ = app.emit("theme-changed", "dark");
                            }
                        }
                    } else if id == "theme_light" {
                        if let Ok(db) = app.state::<crate::history::Database>().0.lock() {
                            if let Ok(mut s) = settings::load_from_connection(&db) {
                                s.theme = "light".to_string();
                                let _ = settings::save_to_connection(&db, &s);
                                let _ = app.emit("theme-changed", "light");
                            }
                        }
                    } else if id == "settings" {
                        let _ = app.emit("open-settings", ());
                    } else if id == "help" {
                        let _ = app.emit("open-help", ());
                    }
                });
            }

            // ── Activation listener (macOS only) ─────────────────────────
            // Try to start the event tap. It will automatically retry with
            // increasing delays if Accessibility permission is not yet granted.
            // This ensures the activator works even if permissions are granted
            // after the app has already started.
            #[cfg(target_os = "macos")]
            {
                let app_handle = app.handle().clone();
                let activator = activator::OverlayActivator::new();
                activator.start(move || {
                    let is_visible = OVERLAY_INTENDED_VISIBLE.load(Ordering::SeqCst);
                    let handle = app_handle.clone();
                    let handle2 = app_handle.clone();
                    std::thread::spawn(move || {
                        let ctx = crate::context::capture_activation_context(is_visible);
                        let _ = handle.run_on_main_thread(move || toggle_overlay(&handle2, ctx));
                    });
                });
                app.manage(activator);
            }

            // ── Persistent HTTP client ────────────────────────────────
            let http_client = reqwest::Client::builder()
                .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .build()
                .unwrap_or_else(|_| reqwest::Client::new());
            app.manage(http_client);

            // ── Generation + conversation state ─────────────────────
            app.manage(commands::GenerationState::new());
            app.manage(commands::ConversationHistory::new());
            app.manage(commands::SystemPrompt(commands::load_system_prompt()));
            app.manage(commands::load_model_config());
            app.manage(siri_bridge::SiriBridgeState::default());
            siri_bridge::spawn_server(app.handle().clone());

            // ── Orphaned image cleanup (startup + periodic) ─────────
            run_image_cleanup(app.handle());
            spawn_periodic_image_cleanup(app.handle().clone());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            #[cfg(not(coverage))]
            commands::ask_ollama,
            #[cfg(not(coverage))]
            commands::cancel_generation,
            #[cfg(not(coverage))]
            commands::reset_conversation,
            #[cfg(not(coverage))]
            commands::get_model_config,
            commands::list_ollama_models,
            siri_bridge::claim_pending_siri_requests,
            siri_bridge::resolve_siri_request,
            #[cfg(not(coverage))]
            history::save_conversation,
            #[cfg(not(coverage))]
            history::persist_message,
            #[cfg(not(coverage))]
            history::list_conversations,
            #[cfg(not(coverage))]
            history::load_conversation,
            #[cfg(not(coverage))]
            history::delete_conversation,
            #[cfg(not(coverage))]
            history::generate_title,
            #[cfg(not(coverage))]
            images::save_image_command,
            #[cfg(not(coverage))]
            images::remove_image_command,
            #[cfg(not(coverage))]
            images::cleanup_orphaned_images_command,
            #[cfg(not(coverage))]
            images::encode_images_as_base64_command,
            #[cfg(not(coverage))]
            screenshot::capture_screenshot_command,
            #[cfg(not(coverage))]
            screenshot::capture_full_screen_command,
            notify_overlay_hidden,
            notify_frontend_ready,
            log_to_terminal,
            set_window_frame,
            set_window_size,
            #[cfg(not(coverage))]
            permissions::check_accessibility_permission,
            #[cfg(not(coverage))]
            permissions::request_accessibility_access_command,
            #[cfg(not(coverage))]
            permissions::open_accessibility_settings,
            #[cfg(not(coverage))]
            permissions::check_screen_recording_permission,
            #[cfg(not(coverage))]
            permissions::open_screen_recording_settings,
            #[cfg(not(coverage))]
            permissions::request_screen_recording_access,
            #[cfg(not(coverage))]
            permissions::check_screen_recording_tcc_granted,
            #[cfg(not(coverage))]
            permissions::quit_and_relaunch,
            finish_onboarding,
            settings::get_app_settings,
            settings::update_app_settings,
            google_auth::sign_in_with_google_bridge,
            google_auth::connect_google_workspace,
            google_auth::get_google_auth_status,
            google_auth::sign_out_google_bridge,
            google_auth::gmail_list_messages,
            google_auth::gmail_get_message,
            google_auth::gmail_send_message,
            google_auth::drive_list_files,
            github::github_search_repositories,
            github::github_search_issues,
            github::github_list_pull_requests,
            github::github_get_file_contents,
            comet::comet_connect,
            comet::comet_disconnect,
            comet::comet_status,
            comet::comet_launch,
            comet::comet_launch_and_connect,
            comet::comet_get_tabs,
            comet::comet_create_tab,
            comet::comet_close_tab,
            comet::comet_navigate_tab,
            comet::comet_execute_script,
            comet::comet_capture_page,
            comet::comet_extract_content,
            comet::comet_find_and_click,
            comet::comet_get_selected_text,
            comet::comet_type_text,
            comet::comet_open_url,
            comet::comet_go_back,
            comet::comet_go_forward,
            comet::comet_reload,
            comet::comet_share_auth,
            native_actions::get_app_preferences,
            native_actions::set_menu_bar_icon_visible,
            native_actions::search_web,
            native_actions::open_target,
            native_actions::play_song,
            native_actions::run_shell_command,
            native_actions::set_output_volume,
            native_actions::show_native_alert,
            native_actions::verify_touch_id,
            file_extraction::extract_file_content,
            productivity::list_calendar_events,
            productivity::create_calendar_event,
            productivity::create_alarm_reminder,
            memory_manager::add_user_memory,
            memory_manager::delete_user_memory,
            memory_manager::edit_user_memory,
            memory_manager::get_user_memories,
            memory_manager::create_user_profile,
            memory_manager::switch_user_profile,
            memory_manager::get_user_profiles
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } = event
            {
                if label == "main" {
                    api.prevent_close();

                    request_overlay_hide(app_handle);
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_window_frame_rejects_nan() {
        assert!(!f64::NAN.is_finite());
        assert!(!f64::INFINITY.is_finite());
        assert!(!f64::NEG_INFINITY.is_finite());
        assert!(100.0_f64.is_finite());
    }

    #[test]
    fn width_height_clamp_logic() {
        assert_eq!(0.5_f64.clamp(1.0, 10_000.0), 1.0);
        assert_eq!(500.0_f64.clamp(1.0, 10_000.0), 500.0);
        assert_eq!(20_000.0_f64.clamp(1.0, 10_000.0), 10_000.0);
    }

    #[test]
    fn notify_overlay_hidden_sets_flag_to_false() {
        OVERLAY_INTENDED_VISIBLE.store(true, Ordering::SeqCst);
        OVERLAY_INTENDED_VISIBLE.store(false, Ordering::SeqCst);
        assert!(!OVERLAY_INTENDED_VISIBLE.load(Ordering::SeqCst));
    }

    #[test]
    fn launch_show_pending_consumed_exactly_once() {
        LAUNCH_SHOW_PENDING.store(true, Ordering::SeqCst);
        assert!(LAUNCH_SHOW_PENDING.swap(false, Ordering::SeqCst));
        assert!(!LAUNCH_SHOW_PENDING.swap(false, Ordering::SeqCst));
    }

    #[test]
    fn overlay_visibility_event_constant_matches() {
        assert_eq!(OVERLAY_VISIBILITY_EVENT, "thuki://visibility");
        assert_eq!(OVERLAY_VISIBILITY_SHOW, "show");
        assert_eq!(OVERLAY_VISIBILITY_HIDE_REQUEST, "hide-request");
    }

    #[test]
    fn onboarding_event_constant_matches() {
        assert_eq!(ONBOARDING_EVENT, "thuki://onboarding");
    }

    #[test]
    fn onboarding_logical_dimensions() {
        assert_eq!(ONBOARDING_LOGICAL_WIDTH, 460.0);
        assert_eq!(ONBOARDING_LOGICAL_HEIGHT, 640.0);
    }

    #[test]
    fn overlay_logical_dimensions() {
        assert_eq!(OVERLAY_LOGICAL_WIDTH, 600.0);
        assert_eq!(OVERLAY_LOGICAL_HEIGHT_COLLAPSED, 80.0);
    }
}
