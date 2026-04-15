use cocoa::appkit::{NSPanel, NSWindow, NSWindowStyleMask, NSWindowLevel, NSBackingStoreType};
use cocoa::base::{id, nil, BOOL, YES, NO};
use cocoa::foundation::{NSPoint, NSSize, NSRect, NSString};
use cocoa::appkit::NSVisualEffectView;
use cocoa::appkit::NSVisualEffectMaterial;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

pub struct OverlayWindow {
    panel: id,
    is_visible: Arc<AtomicBool>,
    position: NSPoint,
    size: NSSize,
}

impl OverlayWindow {
    pub fn new(x: f64, y: f64, width: f64, height: f64) -> Result<Self, String> {
        unsafe {
            let style_mask = NSWindowStyleMask::NSWindowStyleMaskNonactivatingPanel
                | NSWindowStyleMask::NSWindowStyleMaskTitled
                | NSWindowStyleMask::NSWindowStyleMaskClosable
                | NSWindowStyleMask::NSWindowStyleMaskResizable
                | NSWindowStyleMask::NSWindowStyleMaskFullSizeContentView;

            let content_rect = NSRect::new(
                NSPoint::new(x, y),
                NSSize::new(width, height),
            );

            let panel = NSPanel::alloc(nil)
                .initWithContentRect_styleMask_backup2_(
                    content_rect,
                    style_mask,
                    NSBackingStoreType::NSBackingStoreBuffered as u64,
                    false,
                );

            if panel.is_null() {
                return Err("Failed to create panel".to_string());
            }

            panel.setTitlebarAppearsTransparent_(YES);
            panel.setTitleVisibility_(1);
            panel.setMovableByWindowBackground_(YES);
            panel.setLevel_(NSWindowLevel::NSFloatingWindowLevel as i32);
            panel.setCollectionBehavior_(1 | 2 | 8);
            panel.setIsOpaque_(NO);
            panel.setBackgroundColor_(nil);

            let visual_effect = NSVisualEffectView::alloc(nil)
                .initWithFrame_(content_rect);

            if !visual_effect.is_null() {
                visual_effect.setMaterial_(NSVisualEffectMaterial::NSVisualEffectMaterialHudWindow as i64);
                visual_effect.setBlendingMode_(0);
                visual_effect.setState_(1);
                visual_effect.setWantsLayer_(YES);
                visual_effect.layer().setCornerRadius_(20.0);
                visual_effect.layer().setMasksToBounds_(YES);

                panel.setContentView_(visual_effect);
            }

            panel.setFrame_display_(content_rect, YES);

            Ok(Self {
                panel,
                is_visible: Arc::new(AtomicBool::new(false)),
                position: NSPoint::new(x, y),
                size: NSSize::new(width, height),
            })
        }
    }

    pub fn show(&self) {
        unsafe {
            self.panel.makeKeyAndOrderFront_(nil);
        }
        self.is_visible.store(true, Ordering::SeqCst);
    }

    pub fn hide(&self) {
        unsafe {
            self.panel.orderOut_(nil);
        }
        self.is_visible.store(false, Ordering::SeqCst);
    }

    pub fn toggle(&self) {
        if self.is_visible.load(Ordering::SeqCst) {
            self.hide();
        } else {
            self.show();
        }
    }

    pub fn is_visible(&self) -> bool {
        self.is_visible.load(Ordering::SeqCst)
    }

    pub fn set_content_view(&self, view: id) {
        unsafe {
            self.panel.setContentView_(view);
        }
    }

    pub fn set_alpha(&self, alpha: f64) {
        unsafe {
            self.panel.setAlphaValue_(alpha);
        }
    }

    pub fn center(&self) {
        unsafe {
            self.panel.center();
        }
    }

    pub fn set_title(&self, title: &str) {
        unsafe {
            let ns_string = NSString::from_str(title);
            self.panel.setTitle_(ns_string);
        }
    }

    pub fn get_panel_handle(&self) -> id {
        self.panel
    }

    pub fn set_size(&mut self, width: f64, height: f64) {
        self.size = NSSize::new(width, height);
        unsafe {
            let frame = NSRect::new(self.position, self.size);
            self.panel.setFrame_display_(frame, YES);
        }
    }

    pub fn set_position(&mut self, x: f64, y: f64) {
        self.position = NSPoint::new(x, y);
        unsafe {
            let frame = NSRect::new(self.position, self.size);
            self.panel.setFrame_display_(frame, YES);
        }
    }

    pub fn animate_to_position(&self, x: f64, y: f64, duration: f64) {
        unsafe {
            let target_frame = NSRect::new(NSPoint::new(x, y), self.size);

            NSAnimationContext::beginGrouping(nil);
            let context = NSAnimationContext::currentContext(nil);
            context.setDuration_(duration);
            context.setAnimationBlockingMode_(0);

            self.panel.animator().setFrame_(target_frame);

            NSAnimationContext::endGrouping(nil);
        }

        self.position = NSPoint::new(x, y);
    }

    pub fn set_blur_radius(&self, radius: f64) {
        unsafe {
            if let content_view = self.panel.contentView() {
                if let layer = content_view.layer() {
                    layer.setCornerRadius_(radius);
                }
            }
        }
    }

    pub fn enable_shadow(&self, enable: bool) {
        unsafe {
            self.panel.setHasShadow_(if enable { YES } else { NO });
        }
    }

    pub fn set_background_color(&self, red: f64, green: f64, blue: f64, alpha: f64) {
        unsafe {
            let color = NSColor::colorWithRed_green_blue_alpha_(
                nil,
                red,
                green,
                blue,
                alpha,
            );
            self.panel.setBackgroundColor_(color);
        }
    }

    pub fn make_key_window(&self) {
        unsafe {
            self.panel.makeKeyAndOrderFront_(nil);
        }
    }

    pub fn resign_key_window(&self) {
        unsafe {
            self.panel.resignKeyWindow();
        }
    }
}

impl Drop for OverlayWindow {
    fn drop(&mut self) {
        unsafe {
            self.panel.release();
        }
    }
}

pub struct WindowManager {
    windows: std::collections::HashMap<String, OverlayWindow>,
}

impl WindowManager {
    pub fn new() -> Self {
        Self {
            windows: std::collections::HashMap::new(),
        }
    }

    pub fn add_window(&mut self, name: &str, window: OverlayWindow) {
        self.windows.insert(name.to_string(), window);
    }

    pub fn get_window(&self, name: &str) -> Option<&OverlayWindow> {
        self.windows.get(name)
    }

    pub fn get_window_mut(&mut self, name: &str) -> Option<&mut OverlayWindow> {
        self.windows.get_mut(name)
    }

    pub fn remove_window(&mut self, name: &str) {
        self.windows.remove(name);
    }

    pub fn hide_all(&self) {
        for window in self.windows.values() {
            window.hide();
        }
    }

    pub fn show_all(&self) {
        for window in self.windows.values() {
            window.show();
        }
    }

    pub fn toggle_all(&self) {
        for window in self.windows.values() {
            window.toggle();
        }
    }
}

pub fn create_themed_panel(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    theme: &str,
) -> Result<OverlayWindow, String> {
    let mut window = OverlayWindow::new(x, y, width, height)?;

    match theme {
        "dark" => {
            window.set_background_color(0.1, 0.1, 0.15, 0.95);
            window.set_alpha(0.95);
        }
        "light" => {
            window.set_background_color(1.0, 1.0, 1.0, 0.85);
            window.set_alpha(0.85);
        }
        "glass" => {
            window.set_alpha(0.7);
            window.enable_shadow(true);
        }
        _ => {
            window.set_background_color(0.15, 0.15, 0.2, 0.9);
        }
    }

    Ok(window)
}

pub fn get_screen_bounds() -> (f64, f64, f64, f64) {
    unsafe {
        let screen = NSScreen::mainScreen(nil);
        if screen.is_null() {
            return (0.0, 0.0, 1920.0, 1080.0);
        }

        let frame = screen.frame();
        let visible_frame = screen.visibleFrame();

        (
            visible_frame.origin.x,
            visible_frame.origin.y,
            visible_frame.size.width,
            visible_frame.size.height,
        )
    }
}

pub fn get_mouse_position() -> (f64, f64) {
    unsafe {
        let mouse_location = NSEvent::mouseLocation(nil);
        (mouse_location.x, mouse_location.y)
    }
}

pub fn position_panel_near_mouse(panel: &OverlayWindow, offset_x: f64, offset_y: f64) {
    let (mouse_x, mouse_y) = get_mouse_position();
    let screen_bounds = get_screen_bounds();

    let panel_width = panel.size.width;
    let panel_height = panel.size.height;

    let mut new_x = mouse_x + offset_x;
    let mut new_y = mouse_y + offset_y;

    if new_x + panel_width > screen_bounds.0 + screen_bounds.2 {
        new_x = mouse_x - offset_x - panel_width;
    }

    if new_y - panel_height < screen_bounds.1 {
        new_y = mouse_y - offset_y;
    }

    panel.set_position(new_x, new_y);
}

extern "C" {
    fn NSAnimationContext_beginGrouping(ctx: id);
    fn NSAnimationContext_currentContext(ctx: id) -> id;
    fn NSAnimationContext_endGrouping(ctx: id);
    fn NSAnimationContext_setDuration_(ctx: id, duration: f64);
    fn NSAnimationContext_setAnimationBlockingMode_(ctx: id, mode: i64);
}

use tauri::{command, Manager, State};
use std::sync::Mutex;

pub struct OverlayState {
    is_visible: Mutex<bool>,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            is_visible: Mutex::new(false),
        }
    }
}

#[command]
pub fn toggle_overlay(state: State<'_, OverlayState>) -> Result<bool, String> {
    let mut visible = state.is_visible.lock().map_err(|e| e.to_string())?;
    *visible = !*visible;
    Ok(*visible)
}

#[command]
pub fn show_overlay(state: State<'_, OverlayState>) -> Result<(), String> {
    let mut visible = state.is_visible.lock().map_err(|e| e.to_string())?;
    *visible = true;
    Ok(())
}

#[command]
pub fn hide_overlay(state: State<'_, OverlayState>) -> Result<(), String> {
    let mut visible = state.is_visible.lock().map_err(|e| e.to_string())?;
    *visible = false;
    Ok(())
}

#[command]
pub fn is_overlay_visible(state: State<'_, OverlayState>) -> Result<bool, String> {
    let visible = state.is_visible.lock().map_err(|e| e.to_string())?;
    Ok(*visible)
}

#[command]
pub fn get_screen_info() -> Result<ScreenInfo, String> {
    let bounds = get_screen_bounds();
    Ok(ScreenInfo {
        x: bounds.0,
        y: bounds.1,
        width: bounds.2,
        height: bounds.3,
    })
}

#[derive(serde::Serialize)]
pub struct ScreenInfo {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_window_manager() {
        let mut manager = WindowManager::new();
        assert!(manager.get_window("test").is_none());
    }

    #[test]
    fn test_overlay_state() {
        let state = OverlayState::default();
        assert!(state.is_visible.lock().is_ok());
    }
}
