import Cocoa

class MenuBarController: NSObject {
    private var statusItem: NSStatusItem!
    private var menu: NSMenu!
    private weak var appDelegate: AppDelegate?

    init(appDelegate: AppDelegate) {
        self.appDelegate = appDelegate
        super.init()
        setupStatusItem()
        setupMenu()
    }

    private func setupStatusItem() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem.button {
            button.image = NSImage(systemSymbolName: "cpu", accessibilityDescription: "Nexus-AI")
            button.image?.isTemplate = true
        }

        statusItem.behavior = [.removalAllowed, .terminationEnabled]
    }

    private func setupMenu() {
        menu = NSMenu()

        let aboutItem = NSMenuItem(title: "About Nexus-AI", action: #selector(showAbout), keyEquivalent: "")
        aboutItem.target = self
        menu.addItem(aboutItem)

        menu.addItem(NSMenuItem.separator())

        let showItem = NSMenuItem(title: "Show Overlay", action: #selector(showOverlay), keyEquivalent: "o")
        showItem.keyEquivalentModifierMask = [.command, .control]
        showItem.target = self
        menu.addItem(showItem)

        let hideItem = NSMenuItem(title: "Hide Overlay", action: #selector(hideOverlay), keyEquivalent: "h")
        hideItem.keyEquivalentModifierMask = [.command, .control]
        hideItem.target = self
        menu.addItem(hideItem)

        menu.addItem(NSMenuItem.separator())

        let newChatItem = NSMenuItem(title: "New Chat", action: #selector(newChat), keyEquivalent: "n")
        newChatItem.keyEquivalentModifierMask = [.command]
        newChatItem.target = self
        menu.addItem(newChatItem)

        let clearItem = NSMenuItem(title: "Clear Conversation", action: #selector(clearConversation), keyEquivalent: "k")
        clearItem.keyEquivalentModifierMask = [.command, .shift]
        clearItem.target = self
        menu.addItem(clearItem)

        menu.addItem(NSMenuItem.separator())

        let automationsItem = NSMenuItem(title: "Automations", action: #selector(showAutomations), keyEquivalent: "a")
        automationsItem.keyEquivalentModifierMask = [.command, .option]
        automationsItem.target = self
        menu.addItem(automationsItem)

        let settingsItem = NSMenuItem(title: "Settings", action: #selector(showSettings), keyEquivalent: ",")
        settingsItem.keyEquivalentModifierMask = [.command]
        settingsItem.target = self
        menu.addItem(settingsItem)

        menu.addItem(NSMenuItem.separator())

        let shortcutsItem = NSMenuItem(title: "Keyboard Shortcuts", action: #selector(showShortcuts), keyEquivalent: "?")
        shortcutsItem.keyEquivalentModifierMask = [.command, .shift]
        shortcutsItem.target = self
        menu.addItem(shortcutsItem)

        let siriItem = NSMenuItem(title: "Siri Shortcuts", action: #selector(showSiriShortcuts), keyEquivalent: "s")
        siriItem.keyEquivalentModifierMask = [.command, .option]
        siriItem.target = self
        menu.addItem(siriItem)

        menu.addItem(NSMenuItem.separator())

        let launchAtLoginItem = NSMenuItem(title: "Launch at Login", action: #selector(toggleLaunchAtLogin), keyEquivalent: "")
        launchAtLoginItem.state = UserDefaults.standard.bool(forKey: "launchAtLogin") ? .on : .off
        launchAtLoginItem.target = self
        menu.addItem(launchAtLoginItem)

        let autoStartItem = NSMenuItem(title: "Start Hidden", action: #selector(toggleStartHidden), keyEquivalent: "")
        autoStartItem.state = UserDefaults.standard.bool(forKey: "startHidden") ? .on : .off
        autoStartItem.target = self
        menu.addItem(autoStartItem)

        menu.addItem(NSMenuItem.separator())

        let quitItem = NSMenuItem(title: "Quit Nexus-AI", action: #selector(quitApp), keyEquivalent: "q")
        quitItem.keyEquivalentModifierMask = [.command]
        quitItem.target = self
        menu.addItem(quitItem)

        statusItem.menu = menu
    }

    func updateMenuItems() {
        if let launchItem = menu.item(withTitle: "Launch at Login") {
            launchItem.state = UserDefaults.standard.bool(forKey: "launchAtLogin") ? .on : .off
        }
        if let hiddenItem = menu.item(withTitle: "Start Hidden") {
            hiddenItem.state = UserDefaults.standard.bool(forKey: "startHidden") ? .on : .off
        }
    }

    @objc private func showAbout() {
        NSApp.orderFrontStandardAboutPanel(nil)
    }

    @objc private func showOverlay() {
        NotificationCenter.default.post(name: .showOverlay, object: nil)
    }

    @objc private func hideOverlay() {
        NotificationCenter.default.post(name: .hideOverlay, object: nil)
    }

    @objc private func newChat() {
        NotificationCenter.default.post(name: .newChat, object: nil)
    }

    @objc private func clearConversation() {
        NotificationCenter.default.post(name: .clearConversation, object: nil)
    }

    @objc private func showAutomations() {
        NotificationCenter.default.post(name: .showAutomations, object: nil)
    }

    @objc private func showSettings() {
        NotificationCenter.default.post(name: .showSettings, object: nil)
    }

    @objc private func showShortcuts() {
        NotificationCenter.default.post(name: .showShortcuts, object: nil)
    }

    @objc private func showSiriShortcuts() {
        NotificationCenter.default.post(name: .showSiriShortcuts, object: nil)
    }

    @objc private func toggleLaunchAtLogin() {
        let current = UserDefaults.standard.bool(forKey: "launchAtLogin")
        UserDefaults.standard.set(!current, forKey: "launchAtLogin")
        updateMenuItems()

        if !current {
            installLaunchAgent()
        } else {
            uninstallLaunchAgent()
        }
    }

    @objc private func toggleStartHidden() {
        let current = UserDefaults.standard.bool(forKey: "startHidden")
        UserDefaults.standard.set(!current, forKey: "startHidden")
        updateMenuItems()
    }

    @objc private func quitApp() {
        NSApp.terminate(nil)
    }

    private func installLaunchAgent() {
        let script = """
        do shell script "\(Bundle.main.bundlePath)/Contents/MacOS/Nexus-AI" with administrator privileges
        """
        var error: NSDictionary?
        if NSAppleScript(source: script)?.executeAndReturnError(&error) == nil {
            print("Failed to install launch agent: \\(error ?? [:])")
        }
    }

    private func uninstallLaunchAgent() {
    }
}

extension Notification.Name {
    static let showOverlay = Notification.Name("NexusAIShowOverlay")
    static let hideOverlay = Notification.Name("NexusAIHideOverlay")
    static let newChat = Notification.Name("NexusAINewChat")
    static let clearConversation = Notification.Name("NexusAIClearConversation")
    static let showAutomations = Notification.Name("NexusAIShowAutomations")
    static let showSettings = Notification.Name("NexusAIShowSettings")
    static let showShortcuts = Notification.Name("NexusAIShowShortcuts")
    static let showSiriShortcuts = Notification.Name("NexusAIShowSiriShortcuts")
}
