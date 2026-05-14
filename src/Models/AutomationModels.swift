import AppIntents
import AppKit
import Foundation

private let siriBridgeURL = URL(string: "http://127.0.0.1:48321/v1/siri/ask")!

private struct SiriBridgeRequestBody: Encodable {
    let message: String
}

private struct SiriBridgeResponseBody: Decodable {
    let reply: String?
    let error: String?
}

private enum SiriBridgeError: LocalizedError {
    case emptyMessage
    case invalidResponse
    case service(String)
    case unavailable

    var errorDescription: String? {
        switch self {
        case .emptyMessage:
            return "Provide a message for Nexus after \"ask Nexus to\"."
        case .invalidResponse:
            return "Nexus returned an invalid Siri bridge response."
        case .service(let message):
            return message
        case .unavailable:
            return "Nexus did not become ready for Siri in time."
        }
    }
}

private func shouldRetryBridgeRequest(after error: Error) -> Bool {
    guard let urlError = error as? URLError else {
        return false
    }

    switch urlError.code {
    case .cannotFindHost,
         .cannotConnectToHost,
         .dnsLookupFailed,
         .networkConnectionLost,
         .notConnectedToInternet,
         .timedOut:
        return true
    default:
        return false
    }
}

private func askNexusThroughBridge(_ message: String) async throws -> String {
    let trimmed = message.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else {
        throw SiriBridgeError.emptyMessage
    }

    let encoder = JSONEncoder()
    let body = try encoder.encode(SiriBridgeRequestBody(message: trimmed))

    for attempt in 0..<20 {
        var request = URLRequest(url: siriBridgeURL)
        request.httpMethod = "POST"
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 95

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw SiriBridgeError.invalidResponse
            }

            let payload = try JSONDecoder().decode(SiriBridgeResponseBody.self, from: data)

            if (200..<300).contains(httpResponse.statusCode), let reply = payload.reply?.trimmingCharacters(in: .whitespacesAndNewlines), !reply.isEmpty {
                return reply
            }

            if let error = payload.error?.trimmingCharacters(in: .whitespacesAndNewlines), !error.isEmpty {
                throw SiriBridgeError.service(error)
            }

            throw SiriBridgeError.invalidResponse
        } catch {
            if attempt < 19, shouldRetryBridgeRequest(after: error) {
                try await Task.sleep(nanoseconds: 350_000_000)
                continue
            }

            if let localized = (error as? LocalizedError)?.errorDescription {
                throw SiriBridgeError.service(localized)
            }

            throw error
        }
    }

    throw SiriBridgeError.unavailable
}

struct AskNexusIntent: AppIntent {
    static let title: LocalizedStringResource = "Ask Nexus"
    static let description = IntentDescription("Send a message to Nexus and have Siri speak the reply.")
    static let openAppWhenRun = true

    @Parameter(title: "Message")
    var message: String

    static var parameterSummary: some ParameterSummary {
        Summary("Ask Nexus to \(\.$message)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let reply = try await askNexusThroughBridge(message)
        return .result(value: reply, dialog: IntentDialog(stringLiteral: reply))
    }
}

enum MusicPlaybackProvider: String, AppEnum {
    case youtube = "youtube"
    case spotify = "spotify"
    case appleMusic = "apple-music"

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        "Music Provider"
    }

    static var caseDisplayRepresentations: [MusicPlaybackProvider: DisplayRepresentation] = [
        .youtube: "YouTube",
        .spotify: "Spotify",
        .appleMusic: "Apple Music",
    ]
}

struct PlaySongWithNexusIntent: AppIntent {
    static let title: LocalizedStringResource = "Play Song With Nexus"
    static let description = IntentDescription("Ask Nexus to play a song using your preferred music provider.")
    static let openAppWhenRun = true

    @Parameter(title: "Song")
    var song: String

    @Parameter(title: "Provider")
    var provider: MusicPlaybackProvider?

    static var parameterSummary: some ParameterSummary {
        Summary("Play \(\.$song) with \(\.$provider)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        let trimmedSong = song.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedSong.isEmpty else {
            throw SiriBridgeError.emptyMessage
        }

        let message: String
        if let provider {
            message = "/play \(trimmedSong) | \(provider.rawValue)"
        } else {
            message = "/play \(trimmedSong)"
        }

        let reply = try await askNexusThroughBridge(message)
        return .result(value: reply, dialog: IntentDialog(stringLiteral: reply))
    }
}

struct OpenNexusIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Nexus AI"
    static let openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        .result(dialog: "Nexus AI is ready.")
    }
}

struct OpenCometIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Comet AI"
    static let description = IntentDescription("Launch Comet AI from a Shortcut or Siri.")
    static let openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        NSWorkspace.shared.openApplication(
            at: URL(fileURLWithPath: "/Applications/Comet-AI.app"),
            configuration: configuration
        ) { _, _ in }
        return .result(dialog: "Opening Comet AI.")
    }
}

struct SearchWebIntent: AppIntent {
    static let title: LocalizedStringResource = "Search the Web"
    static let description = IntentDescription("Search the web from Nexus AI.")

    @Parameter(title: "Query")
    var query: String

    func perform() async throws -> some IntentResult {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        guard let url = URL(string: "https://www.google.com/search?q=\(encoded)") else {
            throw NSError(domain: "NexusAI.Intent", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "The search query could not be converted into a valid URL."
            ])
        }

        NSWorkspace.shared.open(url)
        return .result(dialog: "Searching the web for \(query).")
    }
}

struct ResearchWithCometIntent: AppIntent {
    static let title: LocalizedStringResource = "Research With Comet"
    static let description = IntentDescription("Open a research URL in Comet AI.")
    static let openAppWhenRun = true

    @Parameter(title: "URL")
    var url: String

    func perform() async throws -> some IntentResult {
        let trimmed = url.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let targetURL = URL(string: trimmed), !trimmed.isEmpty else {
            throw NSError(domain: "NexusAI.Intent", code: 3, userInfo: [
                NSLocalizedDescriptionKey: "Provide a valid URL to open in Comet AI."
            ])
        }

        _ = NSWorkspace.shared.open(targetURL)
        return .result(dialog: "Opening \(trimmed) for research.")
    }
}

struct ExtractFileIntent: AppIntent {
    static let title: LocalizedStringResource = "Extract File Text"
    static let description = IntentDescription("Open a local file in Nexus AI for extraction.")
    static let openAppWhenRun = true

    @Parameter(title: "File Path")
    var path: String

    func perform() async throws -> some IntentResult {
        let trimmed = path.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            throw NSError(domain: "NexusAI.Intent", code: 4, userInfo: [
                NSLocalizedDescriptionKey: "Provide a local file path."
            ])
        }

        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString("/extract \(trimmed)", forType: .string)
        return .result(dialog: "Prepared an extraction command for Nexus AI.")
    }
}

struct SetOutputVolumeIntent: AppIntent {
    static let title: LocalizedStringResource = "Set Output Volume"
    static let description = IntentDescription("Adjust the macOS output volume from a Shortcut or Siri.")

    @Parameter(title: "Volume")
    var level: Int

    func perform() async throws -> some IntentResult {
        let clamped = max(0, min(100, level))
        let script = "set volume output volume \(clamped)"
        var error: NSDictionary?

        let appleScript = NSAppleScript(source: script)
        appleScript?.executeAndReturnError(&error)

        if let error {
            throw NSError(domain: "NexusAI.Intent", code: 2, userInfo: error as? [String: Any])
        }

        return .result(dialog: "Output volume set to \(clamped) percent.")
    }
}

struct NexusShortcuts: AppShortcutsProvider {
    static var shortcutTileColor: ShortcutTileColor = .orange

    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskNexusIntent(),
            phrases: [
                "Ask with \(.applicationName)",
                "Tell \(.applicationName)"
            ],
            shortTitle: "Ask Nexus",
            systemImageName: "message.and.waveform"
        )

        AppShortcut(
            intent: PlaySongWithNexusIntent(),
            phrases: [
                "Play song with \(.applicationName)",
                "Start music with \(.applicationName)"
            ],
            shortTitle: "Play Song",
            systemImageName: "music.note"
        )

        AppShortcut(
            intent: OpenNexusIntent(),
            phrases: [
                "Open \(.applicationName)",
                "Show \(.applicationName)"
            ],
            shortTitle: "Open Nexus",
            systemImageName: "sparkles"
        )

        AppShortcut(
            intent: OpenCometIntent(),
            phrases: [
                "Open Comet AI with \(.applicationName)",
                "Launch Comet AI from \(.applicationName)"
            ],
            shortTitle: "Open Comet",
            systemImageName: "globe"
        )

        AppShortcut(
            intent: SearchWebIntent(),
            phrases: [
                "Search with \(.applicationName)",
                "Look up with \(.applicationName)"
            ],
            shortTitle: "Search Web",
            systemImageName: "magnifyingglass"
        )

        AppShortcut(
            intent: ResearchWithCometIntent(),
            phrases: [
                "Research with \(.applicationName)",
                "Open in Comet from \(.applicationName)"
            ],
            shortTitle: "Research Link",
            systemImageName: "safari"
        )

        AppShortcut(
            intent: ExtractFileIntent(),
            phrases: [
                "Extract file with \(.applicationName)",
                "Read file using \(.applicationName)"
            ],
            shortTitle: "Extract File",
            systemImageName: "doc.text.viewfinder"
        )

        AppShortcut(
            intent: SetOutputVolumeIntent(),
            phrases: [
                "Set Mac volume with \(.applicationName)",
                "Adjust output volume using \(.applicationName)"
            ],
            shortTitle: "Set Volume",
            systemImageName: "speaker.wave.2.fill"
        )
    }
}
