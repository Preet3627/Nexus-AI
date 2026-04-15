import SwiftUI

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedTheme: NexusTheme
    @Binding var autoLaunch: Bool
    @Binding var soundEnabled: Bool
    @Binding var hapticEnabled: Bool
    @Binding var compactMode: Bool
    @Binding var showInDock: Bool

    @State private var selectedSection: SettingsSection = .appearance
    @State private var apiKeyStatuses: [String: Bool] = [:]
    @State private var showingAPIKeyInput: String?

    var body: some View {
        TranslucentPanel(theme: selectedTheme) {
            VStack(spacing: 0) {
                header
                content
            }
        }
        .frame(width: 480, height: 560)
    }

    @ViewBuilder
    private var header: some View {
        HStack {
            Text("Settings")
                .font(.title2.weight(.semibold))

            Spacer()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding()
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private var content: some View {
        HStack(spacing: 0) {
            sidebar
            Divider().padding(.vertical, 12)
            detailView
        }
    }

    @ViewBuilder
    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(SettingsSection.allCases) { section in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        selectedSection = section
                    }
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: section.icon)
                            .font(.system(size: 16))
                            .frame(width: 24)

                        Text(section.rawValue)
                            .font(.subheadline)

                        Spacer()
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(selectedSection == section ? selectedTheme.primaryColor.opacity(0.2) : Color.clear)
                    )
                    .foregroundStyle(selectedSection == section ? selectedTheme.primaryColor : .primary)
                }
                .buttonStyle(.plain)
            }

            Spacer()

            versionInfo
        }
        .padding(12)
        .frame(width: 160)
    }

    @ViewBuilder
    private var detailView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                switch selectedSection {
                case .appearance:
                    appearanceSection
                case .providers:
                    providersSection
                case .security:
                    securitySection
                case .shortcuts:
                    shortcutsSection
                case .automation:
                    automationSection
                }
            }
            .padding()
        }
    }

    @ViewBuilder
    private var appearanceSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader("Theme")

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(NexusTheme.allCases) { theme in
                    ThemeCard(
                        theme: theme,
                        isSelected: selectedTheme == theme,
                        onSelect: {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                selectedTheme = theme
                            }
                        }
                    )
                }
            }

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                sectionHeader("Display")

                Toggle(isOn: $compactMode) {
                    Label("Compact Mode", systemImage: "rectangle.compress.vertical")
                }

                Toggle(isOn: $showInDock) {
                    Label("Show in Dock", systemImage: "dock.rectangle")
                }
            }
        }
    }

    @ViewBuilder
    private var providersSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader("AI Providers")

            ForEach(LLMProviderType.allCases) { provider in
                ProviderCard(
                    provider: provider,
                    hasAPIKey: apiKeyStatuses[provider.rawValue] ?? false,
                    onConfigure: {
                        showingAPIKeyInput = provider.rawValue
                    }
                )
            }
        }
        .sheet(item: Binding(
            get: { showingAPIKeyInput.map { ShowItem(rawValue: $0) } },
            set: { showingAPIKeyInput = $0?.rawValue }
        )) { item in
            APIKeyInputSheet(
                provider: LLMProviderType(rawValue: item.rawValue) ?? .ollama,
                onSave: { key in
                    apiKeyStatuses[item.rawValue] = !key.isEmpty
                    showingAPIKeyInput = nil
                }
            )
        }
    }

    @ViewBuilder
    private var securitySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader("Security")

            Toggle(isOn: $hapticEnabled) {
                VStack(alignment: .leading, spacing: 4) {
                    Label("Touch ID / Face ID", systemImage: "faceid")
                    Text("Require biometric authentication for sensitive actions")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Toggle(isOn: $soundEnabled) {
                VStack(alignment: .leading, spacing: 4) {
                    Label("Sound Effects", systemImage: "speaker.wave.2")
                    Text("Play sounds for typing and completion")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            sectionHeader("Danger Zone")

            Button(role: .destructive) {
            } label: {
                Label("Clear All Data", systemImage: "trash")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
    }

    @ViewBuilder
    private var shortcutsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader("Keyboard Shortcuts")

            ShortcutRow(shortcut: "⌃ Control (Double Tap)", description: "Show/Hide overlay")
            ShortcutRow(shortcut: "⌘ Enter", description: "Send message")
            ShortcutRow(shortcut: "⌘ K", description: "Clear conversation")
            ShortcutRow(shortcut: "⌘ ,", description: "Open settings")

            Divider()

            sectionHeader("Modifier Keys")

            HStack {
                Image(systemName: "control")
                Text("Global hotkey prefix")
                Spacer()
                Text("Control")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(.ultraThinMaterial)
            )
        }
    }

    @ViewBuilder
    private var automationSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionHeader("Automation")

            Toggle(isOn: $autoLaunch) {
                VStack(alignment: .leading, spacing: 4) {
                    Label("Launch at Login", systemImage: "power")
                    Text("Automatically start Nexus-AI when you log in")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            sectionHeader("Comet-AI Integration")

            HStack {
                Image(systemName: "link.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(.blue)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Connect to Comet-AI")
                        .font(.subheadline.weight(.medium))
                    Text("Control your desktop browser remotely")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button("Connect") {
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(.ultraThinMaterial)
            )
        }
    }

    @ViewBuilder
    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(.secondary)
    }

    @ViewBuilder
    private var versionInfo: some View {
        VStack(spacing: 4) {
            Text("Nexus-AI")
                .font(.caption.weight(.semibold))
            Text("v0.1.0")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct ThemeCard: View {
    let theme: NexusTheme
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 8)
                    .fill(
                        LinearGradient(
                            colors: [theme.primaryColor, theme.secondaryColor],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(height: 50)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(isSelected ? Color.white : Color.clear, lineWidth: 2)
                    )
                    .shadow(color: theme.primaryColor.opacity(0.3), radius: isSelected ? 8 : 0)

                Text(theme.rawValue)
                    .font(.caption)
                    .foregroundStyle(isSelected ? theme.primaryColor : .primary)
            }
            .padding(8)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? theme.primaryColor.opacity(0.5) : Color.clear, lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

struct ProviderCard: View {
    let provider: LLMProviderType
    let hasAPIKey: Bool
    let onConfigure: () -> Void

    var body: some View {
        HStack {
            Image(systemName: provider.icon)
                .font(.system(size: 20))
                .foregroundStyle(provider.color.gradient)
                .frame(width: 32)

            VStack(alignment: .leading, spacing: 2) {
                Text(provider.displayName)
                    .font(.subheadline.weight(.medium))

                Text(provider.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack(spacing: 8) {
                Circle()
                    .fill(hasAPIKey ? Color.green : Color.orange)
                    .frame(width: 8, height: 8)

                Text(hasAPIKey ? "Configured" : "Not set")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Button("Configure") {
                onConfigure()
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(.ultraThinMaterial)
        )
    }
}

struct ShortcutRow: View {
    let shortcut: String
    let description: String

    var body: some View {
        HStack {
            Text(description)
                .font(.subheadline)

            Spacer()

            Text(shortcut)
                .font(.system(.subheadline, design: .monospaced))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .fill(.quaternary)
                )
        }
        .padding(.vertical, 4)
    }
}

struct APIKeyInputSheet: View {
    let provider: LLMProviderType
    let onSave: (String) -> Void
    @State private var apiKey: String = ""
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            header
            inputField
            actions
        }
        .padding(24)
        .frame(width: 400)
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private var header: some View {
        VStack(spacing: 8) {
            Image(systemName: provider.icon)
                .font(.system(size: 40))
                .foregroundStyle(provider.color.gradient)

            Text("\(provider.displayName) API Key")
                .font(.title3.weight(.semibold))

            Text("Enter your API key to enable \(provider.displayName)")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    @ViewBuilder
    private var inputField: some View {
        SecureField("API Key", text: $apiKey)
            .textFieldStyle(.roundedBorder)
            .font(.system(.body, design: .monospaced))
    }

    @ViewBuilder
    private var actions: some View {
        HStack(spacing: 12) {
            Button("Cancel") {
                dismiss()
            }
            .buttonStyle(.bordered)

            Button("Save") {
                onSave(apiKey)
                dismiss()
            }
            .buttonStyle(.borderedProminent)
            .disabled(apiKey.isEmpty)
        }
    }
}

enum SettingsSection: String, CaseIterable, Identifiable {
    case appearance = "Appearance"
    case providers = "Providers"
    case security = "Security"
    case shortcuts = "Shortcuts"
    case automation = "Automation"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .appearance: return "paintbrush"
        case .providers: return "cpu"
        case .security: return "lock.shield"
        case .shortcuts: return "keyboard"
        case .automation: return "gearshape.2"
        }
    }
}

struct ShowItem: Identifiable {
    let rawValue: String
    var id: String { rawValue }
}

#Preview {
    SettingsView(
        selectedTheme: .constant(.liquidGlass),
        autoLaunch: .constant(false),
        soundEnabled: .constant(true),
        hapticEnabled: .constant(true),
        compactMode: .constant(false),
        showInDock: .constant(true)
    )
    .frame(width: 480, height: 560)
    .background(
        LinearGradient(
            colors: [.black, .purple.opacity(0.4)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    )
}
