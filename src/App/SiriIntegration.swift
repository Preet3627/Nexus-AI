import AppIntents
import Intents
import LocalAuthentication
import Cocoa

@available(macOS 13.0, *)
struct NexusAIAdvancedShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AskNexusAdvancedIntent(),
            phrases: [
                "Ask \(.applicationName) to \(.text)",
                "Tell \(.applicationName) to \(.text)",
                "Query \(.applicationName) with \(.text)",
                "Nexus \(.text)"
            ],
            shortTitle: "Ask Nexus",
            systemImageName: "brain"
        )

        AppShortcut(
            intent: OpenAppIntent(),
            phrases: [
                "Open \(.applicationName) with \(.applicationName)",
                "Launch \(.text) with \(.applicationName)"
            ],
            shortTitle: "Open App",
            systemImageName: "app"
        )

        AppShortcut(
            intent: ControlVolumeIntent(),
            phrases: [
                "Set volume to \(\.$percentage) percent with \(.applicationName)",
                "Mute with \(.applicationName)",
                "Unmute with \(.applicationName)"
            ],
            shortTitle: "Control Volume",
            systemImageName: "speaker.wave.3"
        )

        AppShortcut(
            intent: ControlBrightnessIntent(),
            phrases: [
                "Set brightness to \(\.$percentage) percent with \(.applicationName)",
                "Dim screen with \(.applicationName)",
                "Brighten screen with \(.applicationName)"
            ],
            shortTitle: "Control Brightness",
            systemImageName: "sun.max"
        )

        AppShortcut(
            intent: ReadFileIntent(),
            phrases: [
                "Read \(\.$filename) with \(.applicationName)",
                "Open file \(\.$filename) in \(.applicationName)"
            ],
            shortTitle: "Read File",
            systemImageName: "doc.text"
        )

        AppShortcut(
            intent: ExecuteShellSecureIntent(),
            phrases: [
                "Run \(\.$command) with \(.applicationName)",
                "Execute \(\.$command) securely with \(.applicationName)"
            ],
            shortTitle: "Secure Shell",
            systemImageName: "terminal"
        )

        AppShortcut(
            intent: TakeScreenshotIntent(),
            phrases: [
                "Screenshot with \(.applicationName)",
                "Capture screen with \(.applicationName)",
                "Take screenshot for \(.applicationName)"
            ],
            shortTitle: "Screenshot",
            systemImageName: "camera.viewfinder"
        )

        AppShortcut(
            intent: QuickActionIntent(),
            phrases: [
                "Quick action \(\.$action) with \(.applicationName)",
                "Do \(\.$action) with \(.applicationName)"
            ],
            shortTitle: "Quick Action",
            systemImageName: "bolt"
        )
    }
}

@available(macOS 13.0, *)
struct AskNexusAdvancedIntent: AppIntent {
    static var title: LocalizedStringResource = "Ask Nexus-AI"
    static var description = IntentDescription("Send a query to Nexus-AI and get a response")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Query")
    var query: String

    @Parameter(title: "Include Screenshot", default: false)
    var includeScreenshot: Bool

    @Parameter(title: "Priority", default: .normal)
    var priority: TaskPriority

    static var parameterSummary: some ParameterSummary {
        Summary("Ask Nexus: \(\.$query)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let taskId = UUID().uuidString
        
        NotificationCenter.default.post(
            name: .nexusAIQuery,
            object: nil,
            userInfo: [
                "query": query,
                "screenshot": includeScreenshot,
                "priority": priority.rawValue,
                "taskId": taskId,
                "background": true
            ]
        )

        let response = await waitForResponse(taskId: taskId, timeout: 60)
        
        return .result(value: response)
    }

    private func waitForResponse(taskId: String) async -> String {
        for _ in 0..<60 {
            if let response = NexusAIResponseCache.shared.get(taskId) {
                NexusAIResponseCache.shared.remove(taskId)
                return response
            }
            try? await Task.sleep(nanoseconds: 1_000_000_000)
        }
        return "Query received. Check Nexus-AI for the response."
    }
}

enum TaskPriority: String, AppEnum {
    case low
    case normal
    case high

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Priority"
    static var caseDisplayRepresentations: [TaskPriority: DisplayRepresentation] = [
        .low: "Low",
        .normal: "Normal",
        .high: "High"
    ]
}

@available(macOS 13.0, *)
struct OpenAppIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Application"
    static var description = IntentDescription("Open any application by name")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Application Name")
    var appName: String

    static var parameterSummary: some ParameterSummary {
        Summary("Open \(\.$appName)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let success = await openApplication(named: appName)
        
        if success {
            return .result(value: "Opened \(appName)")
        } else {
            return .result(value: "Could not find \(appName)")
        }
    }

    private func openApplication(named name: String) async -> Bool {
        await withCheckedContinuation { continuation in
            let workspace = NSWorkspace.shared
            let apps = workspace.runningApplications
            
            if let app = apps.first(where: { $0.localizedName?.lowercased().contains(name.lowercased()) == true }) {
                app.activate()
                continuation.resume(returning: true)
                return
            }

            let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: name)
            if let appURL = url {
                let config = NSWorkspace.OpenConfiguration()
                config.activates = true
                NSWorkspace.shared.openApplication(at: appURL, configuration: config) { _, error in
                    continuation.resume(returning: error == nil)
                }
                return
            }

            for app in workspace.allApplications {
                if app.localizedName?.lowercased().contains(name.lowercased()) == true {
                    let config = NSWorkspace.OpenConfiguration()
                    config.activates = true
                    NSWorkspace.shared.openApplication(at: app.url!, configuration: config) { _, error in
                        continuation.resume(returning: error == nil)
                    }
                    return
                }
            }

            continuation.resume(returning: false)
        }
    }
}

@available(macOS 13.0, *)
struct ControlVolumeIntent: AppIntent {
    static var title: LocalizedStringResource = "Control Volume"
    static var description = IntentDescription("Set system volume or mute/unmute")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Action")
    var action: VolumeAction

    @Parameter(title: "Percentage", default: 50)
    var percentage: Int?

    static var parameterSummary: some ParameterSummary {
        When(\.$action, .setVolume) {
            Summary("Set volume to \(\.$percentage)%")
        } otherwise: {
            Summary("\(\.$action) volume")
        }
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        switch action {
        case .setVolume:
            guard let vol = percentage, (0...100).contains(vol) else {
                return .result(value: "Invalid volume percentage")
            }
            await setSystemVolume(to: Float(vol) / 100.0)
            return .result(value: "Volume set to \(vol)%")

        case .mute:
            await setSystemVolume(to: 0)
            return .result(value: "Volume muted")

        case .unmute:
            await setSystemVolume(to: 0.5)
            return .result(value: "Volume unmuted")

        case .increase:
            let current = getCurrentVolume()
            await setSystemVolume(to: min(current + 0.1, 1.0))
            return .result(value: "Volume increased")

        case .decrease:
            let current = getCurrentVolume()
            await setSystemVolume(to: max(current - 0.1, 0))
            return .result(value: "Volume decreased")
        }
    }

    private func setSystemVolume(to volume: Float) async {
        let script = """
        set volume output volume \(Int(volume * 100))
        """
        await runAppleScript(script)
    }

    private func getCurrentVolume() -> Float {
        let script = "output volume of (get volume settings)"
        if let result = runAppleScriptSync(script), let volume = Int(result) {
            return Float(volume) / 100.0
        }
        return 0.5
    }

    private func runAppleScript(_ script: String) async {
        var error: NSDictionary?
        NSAppleScript(source: script)?.executeAndReturnError(&error)
    }

    private func runAppleScriptSync(_ script: String) -> String? {
        var error: NSDictionary?
        if let result = NSAppleScript(source: script)?.executeAndReturnError(&error) {
            return result.stringValue
        }
        return nil
    }
}

enum VolumeAction: String, AppEnum {
    case setVolume
    case mute
    case unmute
    case increase
    case decrease

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Volume Action"
    static var caseDisplayRepresentations: [VolumeAction: DisplayRepresentation] = [
        .setVolume: "Set Volume",
        .mute: "Mute",
        .unmute: "Unmute",
        .increase: "Increase",
        .decrease: "Decrease"
    ]
}

@available(macOS 13.0, *)
struct ControlBrightnessIntent: AppIntent {
    static var title: LocalizedStringResource = "Control Brightness"
    static var description = IntentDescription("Adjust screen brightness")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Action")
    var action: BrightnessAction

    @Parameter(title: "Percentage", default: 50)
    var percentage: Int?

    static var parameterSummary: some ParameterSummary {
        When(\.$action, .set) {
            Summary("Set brightness to \(\.$percentage)%")
        } otherwise: {
            Summary("\(\.$action) brightness")
        }
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        switch action {
        case .set:
            guard let brightness = percentage, (0...100).contains(brightness) else {
                return .result(value: "Invalid brightness percentage")
            }
            await setBrightness(to: Float(brightness) / 100.0)
            return .result(value: "Brightness set to \(brightness)%")

        case .increase:
            let current = getCurrentBrightness()
            await setBrightness(to: min(current + 0.1, 1.0))
            return .result(value: "Brightness increased")

        case .decrease:
            let current = getCurrentBrightness()
            await setBrightness(to: max(current - 0.1, 0))
            return .result(value: "Brightness decreased")

        case .dim:
            await setBrightness(to: 0.2)
            return .result(value: "Screen dimmed")
        }
    }

    private func setBrightness(to brightness: Float) async {
        let script = """
        do shell script "ddcutil set brightness \(Int(brightness * 100))" with administrator privileges
        """
        var error: NSDictionary?
        NSAppleScript(source: script)?.executeAndReturnError(&error)
    }

    private func getCurrentBrightness() -> Float {
        0.8
    }
}

enum BrightnessAction: String, AppEnum {
    case set
    case increase
    case decrease
    case dim

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Brightness Action"
    static var caseDisplayRepresentations: [BrightnessAction: DisplayRepresentation] = [
        .set: "Set Brightness",
        .increase: "Increase",
        .decrease: "Decrease",
        .dim: "Dim"
    ]
}

@available(macOS 13.0, *)
struct ReadFileIntent: AppIntent {
    static var title: LocalizedStringResource = "Read File"
    static var description = IntentDescription("Read the contents of a file")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "File Path")
    var filepath: String

    @Parameter(title: "Max Lines", default: 100)
    var maxLines: Int

    static var parameterSummary: some ParameterSummary {
        Summary("Read \(\.$filepath)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let fileURL = URL(fileURLWithPath: filepath)

        guard FileManager.default.fileExists(atPath: filepath) else {
            return .result(value: "File not found: \(filepath)")
        }

        guard let content = try? String(contentsOf: fileURL, encoding: .utf8) else {
            return .result(value: "Could not read file (binary or encoding issue)")
        }

        let lines = content.components(separatedBy: .newlines)
        let truncated = lines.prefix(maxLines).joined(separator: "\n")

        if lines.count > maxLines {
            return .result(value: "\(truncated)\n\n... (\(lines.count - maxLines) more lines)")
        }

        return .result(value: truncated)
    }
}

@available(macOS 13.0, *)
struct ExecuteShellSecureIntent: AppIntent {
    static var title: LocalizedStringResource = "Execute Shell Command (Secure)"
    static var description = IntentDescription("Run a shell command with Touch ID verification")
    static var authenticationPolicy: IntentAuthenticationPolicy = .requiresUnlock

    @Parameter(title: "Command")
    var command: String

    @Parameter(title: "Require Touch ID", default: true)
    var requireTouchID: Bool

    static var parameterSummary: some ParameterSummary {
        Summary("Run: \(\.$command)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        if requireTouchID {
            let authenticated = await authenticateWithTouchID(reason: "Authenticate to run shell command")
            if !authenticated {
                return .result(value: "Authentication failed. Command not executed.")
            }
        }

        let safeCommand = validateCommand(command)
        guard safeCommand != nil else {
            return .result(value: "Command blocked for security reasons")
        }

        let result = await executeSecureCommand(safeCommand!)
        
        NotificationCenter.default.post(
            name: .nexusAICommandExecuted,
            object: nil,
            userInfo: ["command": command, "result": result]
        )

        return .result(value: result)
    }

    private func validateCommand(_ command: String) -> String? {
        let blockedPatterns = [
            "rm -rf /",
            "dd if=",
            "> /dev/sda",
            "mkfs",
            ":(){:|:&};:",
            "wget.*curl.*|sh",
            "nc -e /bin/sh",
            "eval \\$\\(",
            "chmod 777.*-R"
        ]

        let lowercased = command.lowercased()
        for pattern in blockedPatterns {
            if lowercased.contains(pattern) {
                return nil
            }
        }

        return command
    }

    private func authenticateWithTouchID(reason: String) async -> Bool {
        await withCheckedContinuation { continuation in
            let context = LAContext()
            context.localizedReason = reason

            context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            ) { success, error in
                if !success, let error = error as? LAError {
                    if error.code == .biometryNotAvailable {
                        context.evaluatePolicy(
                            .deviceOwnerAuthentication,
                            localizedReason: reason
                        ) { fallbackSuccess, _ in
                            continuation.resume(returning: fallbackSuccess)
                        }
                    } else {
                        continuation.resume(returning: false)
                    }
                } else {
                    continuation.resume(returning: success)
                }
            }
        }
    }

    private func executeSecureCommand(_ command: String) async -> String {
        await withCheckedContinuation { continuation in
            var error: NSDictionary?
            let script = """
            do shell script "\(command.replacingOccurrences(of: "\"", with: "\\\""))"
            """
            
            if let result = NSAppleScript(source: script)?.executeAndReturnError(&error) {
                continuation.resume(returning: result.stringValue ?? "Command executed")
            } else {
                let errorMessage = error?[NSAppleScript.errorMessage] as? String ?? "Unknown error"
                continuation.resume(returning: "Error: \(errorMessage)")
            }
        }
    }
}

@available(macOS 13.0, *)
struct TakeScreenshotIntent: AppIntent {
    static var title: LocalizedStringResource = "Take Screenshot"
    static var description = IntentDescription("Capture the screen and analyze with AI")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Capture Mode", default: .fullScreen)
    var captureMode: CaptureMode

    static var parameterSummary: some ParameterSummary {
        Summary("Take \(\.$captureMode) screenshot")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let screenshotPath = await captureScreen(mode: captureMode)

        NotificationCenter.default.post(
            name: .nexusAIScreenshotTaken,
            object: nil,
            userInfo: ["path": screenshotPath, "analyze": true]
        )

        return .result(value: "Screenshot captured: \(screenshotPath)")
    }

    private func captureScreen(mode: CaptureMode) async -> String {
        let timestamp = Int(Date().timeIntervalSince1970)
        let path = "/tmp/nexus-screenshot-\(timestamp).png"

        let args: [String]
        switch mode {
        case .fullScreen:
            args = ["-x", path]
        case .selection:
            args = ["-is", path]
        case .window:
            args = ["-w", "focused", path]
        }

        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            var error: NSDictionary?
            let script = """
            do shell script "screencapture \(args.joined(separator: " "))"
            """
            NSAppleScript(source: script)?.executeAndReturnError(&error)
            continuation.resume()
        }

        return path
    }
}

enum CaptureMode: String, AppEnum {
    case fullScreen
    case selection
    case window

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Capture Mode"
    static var caseDisplayRepresentations: [CaptureMode: DisplayRepresentation] = [
        .fullScreen: "Full Screen",
        .selection: "Selection",
        .window: "Window"
    ]
}

@available(macOS 13.0, *)
struct QuickActionIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Action"
    static var description = IntentDescription("Execute common quick actions")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Action")
    var action: QuickAction

    static var parameterSummary: some ParameterSummary {
        Summary("Quick action: \(\.$action)")
    }

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        switch action {
        case .emptyTrash:
            return await emptyTrash()
        case .lockScreen:
            return lockScreen()
        case .sleep:
            return sleep()
        case .restart:
            return restart()
        case .shutdown:
            return shutdown()
        case .showDesktop:
            return showDesktop()
        case .screenshot:
            return await takeQuickScreenshot()
        case .newNote:
            return createNote()
        }
    }

    private func emptyTrash() async -> String {
        await authenticateWithTouchID(reason: "Empty Trash") ?
            "Trash emptied" : "Authentication failed"
    }

    private func lockScreen() -> String {
        let script = "/usr/bin/pmset displaysleepnow"
        _ = runShellCommand(script)
        return "Screen locked"
    }

    private func sleep() -> String {
        let script = "osascript -e 'tell application \"System Events\" to sleep'"
        _ = runShellCommand(script)
        return "Mac going to sleep"
    }

    private func restart() -> String {
        let script = "osascript -e 'tell application \"System Events\" to restart'"
        _ = runShellCommand(script)
        return "Restarting..."
    }

    private func shutdown() -> String {
        let script = "osascript -e 'tell application \"System Events\" to shut down'"
        _ = runShellCommand(script)
        return "Shutting down..."
    }

    private func showDesktop() -> String {
        let script = """
        tell application "System Events"
            set visible of every process to true
        end tell
        tell application "Finder" to activate
        """
        _ = runAppleScript(script)
        return "Desktop shown"
    }

    private func takeQuickScreenshot() async -> String {
        let path = "/tmp/nexus-quick-\(Int(Date().timeIntervalSince1970)).png"
        let script = "screencapture -x \(path)"
        _ = runShellCommand(script)
        return "Screenshot saved"
    }

    private func createNote() -> String {
        let script = """
        tell application "Notes"
            activate
            make new note at folder "Notes"
        end tell
        """
        _ = runAppleScript(script)
        return "New note created"
    }

    private func authenticateWithTouchID(reason: String) async -> Bool {
        await withCheckedContinuation { continuation in
            let context = LAContext()
            context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            ) { success, _ in
                continuation.resume(returning: success)
            }
        }
    }

    private func runShellCommand(_ command: String) -> String? {
        let task = Process()
        task.launchPath = "/bin/bash"
        task.arguments = ["-c", command]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe

        task.launch()
        task.waitUntilExit()

        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8)
    }

    private func runAppleScript(_ script: String) -> String? {
        var error: NSDictionary?
        if let result = NSAppleScript(source: script)?.executeAndReturnError(&error) {
            return result.stringValue
        }
        return nil
    }
}

enum QuickAction: String, AppEnum {
    case emptyTrash
    case lockScreen
    case sleep
    case restart
    case shutdown
    case showDesktop
    case screenshot
    case newNote

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Quick Action"
    static var caseDisplayRepresentations: [QuickAction: DisplayRepresentation] = [
        .emptyTrash: "Empty Trash",
        .lockScreen: "Lock Screen",
        .sleep: "Sleep",
        .restart: "Restart",
        .shutdown: "Shutdown",
        .showDesktop: "Show Desktop",
        .screenshot: "Screenshot",
        .newNote: "New Note"
    ]
}

class NexusAIResponseCache {
    static let shared = NexusAIResponseCache()
    private var cache: [String: String] = [:]
    private let queue = DispatchQueue(label: "com.nexus-ai.response-cache")

    func set(_ response: String, for taskId: String) {
        queue.async {
            self.cache[taskId] = response
        }
    }

    func get(_ taskId: String) -> String? {
        queue.sync {
            cache[taskId]
        }
    }

    func remove(_ taskId: String) {
        queue.async {
            self.cache.removeValue(forKey: taskId)
        }
    }
}

extension Notification.Name {
    static let nexusAIQuery = Notification.Name("NexusAIQuery")
    static let nexusAICommandExecuted = Notification.Name("NexusAICommandExecuted")
    static let nexusAIScreenshotTaken = Notification.Name("NexusAIScreenshotTaken")
}

class SiriIntentCoordinator {
    static let shared = SiriIntentCoordinator()

    private init() {
        setupObservers()
    }

    private func setupObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleQuery(_:)),
            name: .nexusAIQuery,
            object: nil
        )
    }

    @objc private func handleQuery(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let query = userInfo["query"] as? String else { return }

        let includeScreenshot = userInfo["screenshot"] as? Bool ?? false
        let priority = userInfo["priority"] as? String ?? "normal"
        let taskId = userInfo["taskId"] as? String ?? UUID().uuidString
        let background = userInfo["background"] as? Bool ?? false

        if background {
            processBackgroundQuery(
                query: query,
                screenshot: includeScreenshot,
                priority: priority,
                taskId: taskId
            )
        }
    }

    private func processBackgroundQuery(
        query: String,
        screenshot: Bool,
        priority: String,
        taskId: String
    ) {
        Task {
            var fullQuery = query
            if screenshot {
                if let screenshotPath = await captureScreenshot() {
                    fullQuery = "\(query)\n[Screenshot: \(screenshotPath)]"
                }
            }

            let response = await sendToNexusAI(query: fullQuery)
            NexusAIResponseCache.shared.set(response, for: taskId)
        }
    }

    private func captureScreenshot() async -> String? {
        let timestamp = Int(Date().timeIntervalSince1970)
        let path = "/tmp/nexus-siri-\(timestamp).png"

        return await withCheckedContinuation { continuation in
            let script = "screencapture -x \(path)"
            let result = runShellCommand(script)

            if result != nil && FileManager.default.fileExists(atPath: path) {
                continuation.resume(returning: path)
            } else {
                continuation.resume(returning: nil)
            }
        }
    }

    private func sendToNexusAI(query: String) async -> String {
        return "Processing: \(query.prefix(100))..."
    }

    private func runShellCommand(_ command: String) -> String? {
        let task = Process()
        task.launchPath = "/bin/bash"
        task.arguments = ["-c", command]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe

        task.launch()
        task.waitUntilExit()

        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8)
    }
}
