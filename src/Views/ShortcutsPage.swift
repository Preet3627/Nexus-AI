import SwiftUI

struct ShortcutsPage: View {
    @Binding var theme: NexusTheme
    @State private var searchText = ""
    @State private var selectedCategory: ShortcutCategory = .all

    enum ShortcutCategory: String, CaseIterable {
        case all = "All"
        case overlay = "Overlay"
        case chat = "Chat"
        case automation = "Automation"
        case system = "System"
    }

    private let shortcuts: [KeyboardShortcut] = [
        KeyboardShortcut(
            category: .overlay,
            keys: "⌃ Control (Double Tap)",
            action: "Toggle overlay visibility",
            description: "Press Control twice quickly to show/hide the floating overlay"
        ),
        KeyboardShortcut(
            category: .overlay,
            keys: "⌘ W",
            action: "Close overlay",
            description: "Hides the overlay window"
        ),
        KeyboardShortcut(
            category: .overlay,
            keys: "⌘ H",
            action: "Hide overlay",
            description: "Hides the overlay window"
        ),
        KeyboardShortcut(
            category: .chat,
            keys: "⌘ Enter",
            action: "Send message",
            description: "Send your current message to the AI"
        ),
        KeyboardShortcut(
            category: .chat,
            keys: "⌘ N",
            action: "New conversation",
            description: "Start a fresh chat conversation"
        ),
        KeyboardShortcut(
            category: .chat,
            keys: "⌘ K",
            action: "Clear conversation",
            description: "Clear all messages in the current conversation"
        ),
        KeyboardShortcut(
            category: .chat,
            keys: "⌘ ⇧ K",
            action: "Search conversations",
            description: "Search through past conversations"
        ),
        KeyboardShortcut(
            category: .chat,
            keys: "↑ / ↓",
            action: "Navigate history",
            description: "Navigate through your message history"
        ),
        KeyboardShortcut(
            category: .chat,
            keys: "Tab",
            action: "Complete suggestion",
            description: "Accept the current AI suggestion"
        ),
        KeyboardShortcut(
            category: .automation,
            keys: "⌘ ⌥ A",
            action: "Open automations",
            description: "Open the automation management panel"
        ),
        KeyboardShortcut(
            category: .automation,
            keys: "⌘ ⌥ R",
            action: "Run all tasks",
            description: "Run all due automation tasks immediately"
        ),
        KeyboardShortcut(
            category: .system,
            keys: "⌘ ,",
            action: "Open settings",
            description: "Open the settings panel"
        ),
        KeyboardShortcut(
            category: .system,
            keys: "⌘ ?",
            action: "Keyboard shortcuts",
            description: "Show this keyboard shortcuts reference"
        ),
        KeyboardShortcut(
            category: .system,
            keys: "⌘ ⌥ S",
            action: "Siri shortcuts",
            description: "Open Siri Shortcuts integration"
        ),
        KeyboardShortcut(
            category: .system,
            keys: "⌘ Q",
            action: "Quit",
            description: "Quit Nexus-AI completely"
        ),
    ]

    var filteredShortcuts: [KeyboardShortcut] {
        shortcuts.filter { shortcut in
            let matchesCategory = selectedCategory == .all || shortcut.category == selectedCategory
            let matchesSearch = searchText.isEmpty ||
                shortcut.action.localizedCaseInsensitiveContains(searchText) ||
                shortcut.keys.localizedCaseInsensitiveContains(searchText)
            return matchesCategory && matchesSearch
        }
    }

    var body: some View {
        TranslucentPanel(theme: theme) {
            VStack(spacing: 0) {
                header
                searchAndFilter
                shortcutsList
            }
        }
        .frame(width: 600, height: 500)
    }

    @ViewBuilder
    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Keyboard Shortcuts")
                    .font(.title2.weight(.semibold))
                Text("Press ⌘ ? anytime to view shortcuts")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private var searchAndFilter: some View {
        HStack(spacing: 12) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search shortcuts...", text: $searchText)
                    .textFieldStyle(.plain)
            }
            .padding(8)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(.ultraThinMaterial)
            )

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ShortcutCategory.allCases, id: \.self) { category in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedCategory = category
                            }
                        } label: {
                            Text(category.rawValue)
                                .font(.subheadline)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(
                                    Capsule()
                                        .fill(selectedCategory == category ? theme.primaryColor.opacity(0.2) : Color.clear)
                                )
                                .overlay(
                                    Capsule()
                                        .stroke(selectedCategory == category ? theme.primaryColor : Color.gray.opacity(0.3), lineWidth: 1)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding()
    }

    @ViewBuilder
    private var shortcutsList: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(filteredShortcuts) { shortcut in
                    ShortcutRow(shortcut: shortcut, theme: theme)
                }
            }
            .padding()
        }
    }
}

struct KeyboardShortcut: Identifiable {
    let id = UUID()
    let category: ShortcutsPage.ShortcutCategory
    let keys: String
    let action: String
    let description: String
}

struct ShortcutRow: View {
    let shortcut: KeyboardShortcut
    let theme: NexusTheme

    var body: some View {
        HStack(spacing: 16) {
            Text(shortcut.action)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer()

            Text(shortcut.description)
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: 200, alignment: .trailing)

            keysBadge
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(.ultraThinMaterial)
        )
    }

    @ViewBuilder
    private var keysBadge: some View {
        Text(shortcut.keys)
            .font(.system(.caption, design: .monospaced))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(theme.primaryColor.opacity(0.15))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(theme.primaryColor.opacity(0.3), lineWidth: 1)
            )
    }
}

struct GlobalHotkeyView: View {
    @Binding var theme: NexusTheme
    @State private var hotkey = "⌃ Control"
    @State private var tapInterval: Double = 400
    @State private var cooldown: Double = 600
    @State private var soundEnabled = true

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Global Hotkey")
                .font(.headline)

            GroupBox("Activation Key") {
                HStack {
                    Picker("Key", selection: $hotkey) {
                        Text("⌃ Control").tag("⌃ Control")
                        Text("⌥ Option").tag("⌥ Option")
                        Text("⌘ Command").tag("⌘ Command")
                    }
                    .pickerStyle(.segmented)
                }
                .padding()
            }

            GroupBox("Timing") {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Double-tap window")
                        Spacer()
                        Text("\(Int(tapInterval))ms")
                            .foregroundStyle(.secondary)
                    }
                    Slider(value: $tapInterval, in: 200...800, step: 50)

                    HStack {
                        Text("Cooldown after activation")
                        Spacer()
                        Text("\(Int(cooldown))ms")
                            .foregroundStyle(.secondary)
                    }
                    Slider(value: $cooldown, in: 300...1200, step: 50)
                }
                .padding()
            }

            Toggle("Play sound on activation", isOn: $soundEnabled)

            Text("Cooldown prevents accidental repeated activations")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ShortcutsPage(theme: .constant(.liquidGlass))
}
