import Foundation
import LocalAuthentication
import SwiftUI

@MainActor
final class AppSettings: ObservableObject {
    @Published var query = ""
    @Published var selectedProvider = "Ollama"
    @Published var identityStatus = "Touch ID ready"
    @Published var statusHeadline = "Native command deck online"
    @Published var lastCommandResult = "Native actions can search the web, open apps, adjust volume, and verify Touch ID."
    @Published var isMenuBarIconHidden = false

    let availableProviders = ["Ollama", "OpenAI", "Anthropic", "Google"]
    let commandHints = [
        "⌃⌃ overlay summon",
        "/touchid confirm sensitive task",
        "/shell run local automations",
        "/web research in default browser"
    ]

    let quickActions: [QuickAction] = [
        QuickAction(
            title: "Search the web",
            subtitle: "Open the default browser from the launcher.",
            command: "/web raycast style translucent mac app",
            symbol: "globe",
            tint: Color(red: 1.0, green: 0.60, blue: 0.39)
        ),
        QuickAction(
            title: "Run shell command",
            subtitle: "Execute a local command and capture the output.",
            command: "/shell uname -a",
            symbol: "terminal",
            tint: Color(red: 0.39, green: 0.58, blue: 1.0)
        ),
        QuickAction(
            title: "Adjust volume",
            subtitle: "Set the Mac output volume with a command.",
            command: "/volume 35",
            symbol: "speaker.wave.2.fill",
            tint: Color(red: 0.45, green: 0.80, blue: 0.58)
        ),
        QuickAction(
            title: "Hide menu bar icon",
            subtitle: "Keep the app background-first like Raycast.",
            command: "/menuicon hide",
            symbol: "rectangle.compress.vertical",
            tint: Color(red: 0.89, green: 0.67, blue: 0.31)
        )
    ]

    let presets: [CommandPreset] = [
        CommandPreset(title: "Control twice to open", command: "⌃⌃"),
        CommandPreset(title: "Search with /web", command: "/web native macOS launcher"),
        CommandPreset(title: "Verify Touch ID", command: "/touchid Unlock Nexus AI"),
    ]

    func apply(_ action: QuickAction) {
        query = action.command
        statusHeadline = action.title
        lastCommandResult = action.subtitle
    }

    func stage(_ preset: CommandPreset) {
        query = preset.command
        statusHeadline = preset.title
        lastCommandResult = "Prepared command \(preset.command)"
    }

    func runCurrentQuery() {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            statusHeadline = "Type a command first"
            return
        }

        statusHeadline = "Command staged"
        lastCommandResult = "Ready to run with \(selectedProvider): \(trimmed)"
    }

    func verifyTouchID() async {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            identityStatus = error?.localizedDescription ?? "Biometric authentication is not available."
            return
        }

        let reason = "Verify your identity before running protected Nexus AI actions."

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            identityStatus = success ? "Touch ID verified" : "Touch ID not verified"
            statusHeadline = success ? "Identity confirmed" : "Identity check failed"
        } catch {
            identityStatus = error.localizedDescription
            statusHeadline = "Touch ID unavailable"
        }
    }
}
