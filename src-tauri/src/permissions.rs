/*!
 * Permissions Module
 *
 * Exposes Tauri commands for querying and requesting macOS privacy permissions
 * required by Thuki (Accessibility and Screen Recording), plus the pure-logic
 * helper that decides whether the onboarding screen must be shown.
 *
 * Architecture: thin command wrappers (excluded from coverage) delegate to
 * small, testable functions. The only logic exercised at test-time is
 * `needs_onboarding`, which is a pure predicate with no OS side-effects.
 */

// ─── Pure Logic ──────────────────────────────────────────────────────────────

/// Returns `true` when at least one required permission has not been granted.
///
/// Both Accessibility (hotkey listener) and Screen Recording (/screen command)
/// must be granted for Thuki to function fully. If either is missing the
/// onboarding screen is shown instead of the normal overlay.
pub fn needs_onboarding(accessibility: bool, screen_recording: bool) -> bool {
    !accessibility || !screen_recording
}

// ─── macOS Permission Checks ─────────────────────────────────────────────────

#[cfg(target_os = "macos")]
#[link(name = "ApplicationServices", kind = "framework")]
extern "C" {
    fn AXIsProcessTrusted() -> bool;
    fn AXIsProcessTrustedWithOptions(options: *const std::ffi::c_void) -> bool;
}

/// Returns whether the process currently has Accessibility permission.
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn is_accessibility_granted() -> bool {
    unsafe { AXIsProcessTrusted() }
}

/// Requests Accessibility access by showing the native system prompt.
/// Uses AXIsProcessTrustedWithOptions with kAXTrustedCheckOptionPrompt = true.
/// Returns true immediately if already granted, false if the user needs to grant it manually.
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn request_accessibility_access() -> bool {
    unsafe {
        if AXIsProcessTrusted() {
            return true;
        }

        use core_foundation::base::TCFType;
        use core_foundation::boolean::CFBoolean;
        use core_foundation::dictionary::CFDictionary;
        use core_foundation::string::CFString;

        let key = CFString::new("AXTrustedCheckOptionPrompt");
        let value = CFBoolean::true_value();
        let dict = CFDictionary::from_CFType_pairs(&[(key.as_CFType(), value.as_CFType())]);
        AXIsProcessTrustedWithOptions(dict.as_concrete_TypeRef() as *const std::ffi::c_void)
    }
}

/// Returns whether the process currently has Screen Recording permission.
///
/// Uses `CGPreflightScreenCaptureAccess`, which only returns `true` after
/// a full restart post-grant (unlike `CGWindowListCopyWindowInfo` which
/// returns non-null immediately but before pixels are actually accessible).
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn is_screen_recording_granted() -> bool {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGPreflightScreenCaptureAccess() -> bool;
    }
    unsafe { CGPreflightScreenCaptureAccess() }
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

/// Returns whether Accessibility permission has been granted.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn check_accessibility_permission() -> bool {
    is_accessibility_granted()
}

/// Requests Accessibility access by showing the native macOS prompt.
/// Returns true if already granted, false if the system prompt was shown.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn request_accessibility_access_command() -> bool {
    request_accessibility_access()
}

/// Opens System Settings to the Accessibility privacy pane so the user can
/// enable the permission without encountering the native system popup.
///
/// This gives a consistent onboarding experience: both Accessibility and
/// Screen Recording are granted via System Settings rather than native dialogs.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn open_accessibility_settings() -> Result<(), String> {
    // macOS 13+ (Ventura, Sonoma, Sequoia) uses a different pane identifier.
    // Try the modern URL first, fall back to the legacy URL.
    let urls = [
        "x-apple.systempreferences:com.apple.settings.PrivacySecurity?Privacy_Accessibility",
        "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    ];

    for url in &urls {
        match std::process::Command::new("open").arg(url).spawn() {
            Ok(_) => return Ok(()),
            Err(_) => continue,
        }
    }

    Err("Failed to open Accessibility settings — `open` command not found".to_string())
}

/// Returns whether Screen Recording permission has been granted.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn check_screen_recording_permission() -> bool {
    is_screen_recording_granted()
}

/// Opens System Settings to the Screen Recording privacy pane so the user
/// can enable the permission without navigating there manually.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn open_screen_recording_settings() -> Result<(), String> {
    let urls = [
        "x-apple.systempreferences:com.apple.settings.PrivacySecurity?Privacy_ScreenCapture",
        "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
    ];

    for url in &urls {
        match std::process::Command::new("open").arg(url).spawn() {
            Ok(_) => return Ok(()),
            Err(_) => continue,
        }
    }

    Err("Failed to open Screen Recording settings — `open` command not found".to_string())
}

/// Registers Thuki in the Screen Recording privacy pane and shows the macOS
/// permission prompt.
///
/// `CGRequestScreenCaptureAccess` is the only API that both adds the app to
/// System Settings > Privacy & Security > Screen & System Audio Recording and
/// triggers the native "allow screen recording" alert. Without calling this
/// first, Thuki will not appear in the Screen Recording list at all.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn request_screen_recording_access() {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGRequestScreenCaptureAccess() -> bool;
    }
    unsafe {
        CGRequestScreenCaptureAccess();
    }
}

/// Returns `true` if Screen & System Audio Recording permission is currently
/// granted. Delegates to `CGPreflightScreenCaptureAccess`, which correctly
/// returns `false` when the permission has not been granted, fixing the
/// historical false-positive from `CGWindowListCopyWindowInfo(0, 0)`.
///
/// Called by PermissionsStep during onboarding polling so the "Quit & Reopen"
/// prompt appears once the user toggles the permission on in System Settings.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn check_screen_recording_tcc_granted() -> bool {
    is_screen_recording_granted()
}

/// Quits Thuki and immediately relaunches it.
///
/// Called after the user grants Screen Recording permission. macOS requires
/// a full process restart before the new permission takes effect.
///
/// Marks onboarding complete so the next launch shows the overlay directly.
#[tauri::command]
#[cfg(target_os = "macos")]
#[cfg_attr(coverage_nightly, coverage(off))]
pub fn quit_and_relaunch(app_handle: tauri::AppHandle, db: tauri::State<crate::history::Database>) {
    if let Ok(conn) = db.0.lock() {
        let _ = crate::onboarding::mark_complete(&conn);
    }
    app_handle.restart();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn needs_onboarding_false_when_both_granted() {
        assert!(!needs_onboarding(true, true));
    }

    #[test]
    fn needs_onboarding_true_when_accessibility_missing() {
        assert!(needs_onboarding(false, true));
    }

    #[test]
    fn needs_onboarding_true_when_screen_recording_missing() {
        assert!(needs_onboarding(true, false));
    }

    #[test]
    fn needs_onboarding_true_when_both_missing() {
        assert!(needs_onboarding(false, false));
    }
}
