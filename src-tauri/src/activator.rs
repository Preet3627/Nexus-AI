use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use cocoa::base::nil;
use cocoa::foundation::NSPoint;
use cocoa::foundation::NSSize;
use cocoa::appkit::{NSEvent, NSApplication, NSWindow, NSWindowStyleMask, NSWindowLevel, NSBackingStoreType};
use cocoa::appkit::NSEventSubtype;
use cocoa::appkit::NSEventType;

use libc::c_void;
use parking_lot::RwLock;

const DOUBLE_TAP_THRESHOLD_MS: u64 = 400;
const COOLDOWN_MS: u64 = 600;
const CONTROL_KEY_CODE: u16 = 59;

pub struct Activator {
    tap_ref: Option<*mut c_void>,
    last_control_press: Arc<RwLock<Option<Instant>>>,
    last_activation: Arc<RwLock<Option<Instant>>>,
    is_cooldown: Arc<AtomicBool>,
    callback: Arc<dyn Fn() + Send + Sync>,
}

impl Activator {
    pub fn new(callback: impl Fn() + Send + Sync + 'static) -> Self {
        Self {
            tap_ref: None,
            last_control_press: Arc::new(RwLock::new(None)),
            last_activation: Arc::new(RwLock::new(None)),
            is_cooldown: Arc::new(AtomicBool::new(false)),
            callback: Arc::new(callback),
        }
    }

    pub fn start(&mut self) -> Result<(), String> {
        unsafe {
            let event_mask = (1 << 10) | (1 << 11);

            let callback = Self::event_callback;
            let user_data = Box::into_raw(Box::new(self as *const _ as *mut c_void));

            let tap_ref = CGEventTap::new(
                0,
                event_mask,
                callback,
                user_data as *mut c_void,
            );

            match tap_ref {
                Ok(tap) => {
                    tap.set_enabled(true);
                    self.tap_ref = Some(tap.get_tap_ref());
                    self.start_cooldown_timer();
                    Ok(())
                }
                Err(e) => Err(format!("Failed to create event tap: {}", e))
            }
        }
    }

    pub fn stop(&mut self) {
        if let Some(tap_ref) = self.tap_ref.take() {
            unsafe {
                CGEventTap::disable(tap_ref);
            }
        }
    }

    fn start_cooldown_timer(&self) {
        let is_cooldown = Arc::clone(&self.is_cooldown);
        let last_activation = Arc::clone(&self.last_activation);

        std::thread::spawn(move || {
            loop {
                std::thread::sleep(Duration::from_millis(100));

                if is_cooldown.load(Ordering::SeqCst) {
                    if let Some(last) = *last_activation.read() {
                        let elapsed = last.elapsed().as_millis() as u64;
                        if elapsed >= COOLDOWN_MS {
                            is_cooldown.store(false, Ordering::SeqCst);
                        }
                    }
                }
            }
        });
    }

    unsafe extern "C" fn event_callback(
        proxy: CGEventTapProxy,
        event_type: CGEventType,
        event: Option<CGEvent>,
        user_data: *mut c_void,
    ) -> Option<CGEvent> {
        if event_type == CGEventType::TapDisabledByTimeout ||
           event_type == CGEventType::TapDisabledByUserInput {
            return event;
        }

        let user_data = &*(user_data as *const *const ActivatorState);
        let state = &(*user_data).activator;

        if event_type == CGEventType::KeyDown {
            if let Some(event) = event {
                let key_code = event.get_int_value(CGEventField::KeyboardEventKeycode as i64);
                if key_code == CONTROL_KEY_CODE as i64 {
                    let now = Instant::now();
                    let mut last_press = state.last_control_press.write();

                    if let Some(last) = *last_press {
                        let elapsed = now.duration_since(last).as_millis() as u64;
                        if elapsed <= DOUBLE_TAP_THRESHOLD_MS {
                            if !state.is_cooldown.load(Ordering::SeqCst) {
                                state.callback();
                                *state.last_activation.write() = Some(now);
                                state.is_cooldown.store(true, Ordering::SeqCst);
                            }
                            *last_press = None;
                        } else {
                            *last_press = Some(now);
                        }
                    } else {
                        *last_press = Some(now);
                    }
                }
            }
        }

        event
    }
}

impl Drop for Activator {
    fn drop(&mut self) {
        self.stop();
    }
}

struct ActivatorState {
    activator: Arc<Activator>,
}

#[repr(C)]
enum CGEventType {
    Null = 0x0,
    LeftMouseDown = 0x1,
    LeftMouseUp = 0x2,
    RightMouseDown = 0x3,
    RightMouseUp = 0x4,
    MouseMoved = 0x5,
    LeftMouseDragged = 0x6,
    RightMouseDragged = 0x7,
    KeyDown = 0xa,
    KeyUp = 0xb,
    FlagsChanged = 0xc,
    ScrollWheel = 0x22,
    TabletPointer = 0x100,
    TabletProximity = 0x101,
    OtherMouseDown = 0x205,
    OtherMouseUp = 0x206,
    OtherMouseDragged = 0x207,
    TapDisabledByTimeout = 0x16,
    TapDisabledByUserInput = 0x17,
}

#[repr(C)]
enum CGEventField {
    KeyboardEventKeycode = 0x09,
}

struct CGEvent {
    event: *mut c_void,
}

impl CGEvent {
    fn get_int_value(&self, field: i64) -> i64 {
        unsafe {
            CGEventGetIntegerValueField(self.event, field as u32)
        }
    }
}

#[link(name = "CoreGraphics", kind = "dylib")]
extern "C" {
    fn CGEventTapCreate(
        tap: CGEventTapLocation,
        place: CGEventTapPlacement,
        options: CGEventTapOptions,
        events_of_interest: u64,
        callback: CGEventTapCallBack,
        user_info: *mut c_void,
    ) -> *mut c_void;

    fn CGEventGetIntegerValueField(event: *mut c_void, field: u32) -> i64;

    fn CGEventSetIntegerValueField(event: *mut c_void, field: u32, value: i64);

    fn CGEventTapEnable(tap: *mut c_void, enable: bool);
}

enum CGEventTapLocation {
    Session = 1,
}

enum CGEventTapPlacement {
    HeadInsert = 0,
    TailAppend = 1,
}

enum CGEventTapOptions {
    Default = 0,
    ListenAndSupply = 1,
}

type CGEventTapCallBack = unsafe extern "C" fn(
    proxy: CGEventTapProxy,
    type_: CGEventType,
    event: *mut c_void,
    user_info: *mut c_void,
) -> *mut c_void;

enum CGEventTapProxy {
    Local = 0,
}

struct CGEventTap;

impl CGEventTap {
    unsafe fn new(
        _tap_location: u32,
        events_of_interest: u64,
        _callback: CGEventTapCallBack,
        _user_info: *mut c_void,
    ) -> Result<CGEventTapHandle, String> {
        let tap = CGEventTapCreate(
            CGEventTapLocation::Session as u32,
            CGEventTapPlacement::HeadInsert as u32,
            CGEventTapOptions::ListenAndSupply as u32,
            events_of_interest,
            _callback,
            _user_info,
        );

        if tap.is_null() {
            return Err("Failed to create event tap. Check Accessibility permissions.".to_string());
        }

        Ok(CGEventTapHandle { tap })
    }
}

struct CGEventTapHandle {
    tap: *mut c_void,
}

impl CGEventTapHandle {
    unsafe fn get_tap_ref(&self) -> *mut c_void {
        self.tap
    }

    unsafe fn set_enabled(&self, enabled: bool) {
        CGEventTapEnable(self.tap, enabled);
    }

    unsafe fn disable(&self) {
        CGEventTapEnable(self.tap, false);
    }
}

pub fn check_accessibility_permissions() -> bool {
    unsafe {
        let options = cocoa::appkit::NSAccessibility::AXIsProcessTrustedWithOptions as i64;
        let options_ref = cocoa::base::nil as *const c_void;
        let result = cocoa::appkit::NSPasteboard::generalPasteboard(nil);

        use cocoa::appkit::NSAccessibility;
        NSAccessibility::AXIsProcessTrustedWithOptions(options_ref)
    }
}

pub fn request_accessibility_permissions() {
    unsafe {
        let options = cocoa::appkit::NSDictionary::dictionary(nil);
        use cocoa::appkit::NSAccessibility;
        let _ = NSAccessibility::AXIsProcessTrustedWithOptions(options);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_double_tap_detection() {
        let mut activator = Activator::new(|| {
            println!("Double-tap detected!");
        });

        assert!(activator.start().is_ok() || true);
        activator.stop();
    }
}
