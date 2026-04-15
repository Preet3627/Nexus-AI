import Foundation
import ServiceManagement
import LocalAuthentication

class SystemControlService {
    static let shared = SystemControlService()

    private init() {}

    func setVolume(_ volume: Float) {
        let clampedVolume = max(0, min(1, volume))
        let volumeInt = Int(clampedVolume * 100)

        let script = "set volume output volume \(volumeInt)"
        runAppleScript(script)
    }

    func getVolume() -> Float {
        let script = "output volume of (get volume settings)"
        if let result = runAppleScript(script), let volume = Int(result) {
            return Float(volume) / 100.0
        }
        return 0.5
    }

    func mute() {
        setVolume(0)
    }

    func unmute() {
        setVolume(0.5)
    }

    func setBrightness(_ brightness: Float) {
        let clampedBrightness = max(0, min(1, brightness))

        let script = """
        do shell script "ddcutil set brightness \(Int(clampedBrightness * 100))" with administrator privileges
        """
        runAppleScript(script)
    }

    func getBrightness() -> Float {
        0.8
    }

    func setScreenBrightness(display: Int = 0, brightness: Float) {
        let clampedBrightness = max(0, min(1, brightness))
        let brightnessInt = Int(clampedBrightness * 100)

        let script = """
        do shell script " brightness -d \(display) \(brightnessInt)" with administrator privileges
        """
        runAppleScript(script)
    }

    func lockScreen() {
        let script = "/usr/bin/pmset displaysleepnow"
        runShellCommand(script)
    }

    func sleep() {
        let script = """
        tell application "System Events" to sleep
        """
        runAppleScript(script)
    }

    func restart() {
        let script = """
        tell application "System Events" to restart
        """
        runAppleScript(script)
    }

    func shutdown() {
        let script = """
        tell application "System Events" to shut down
        """
        runAppleScript(script)
    }

    func emptyTrash() async -> Bool {
        let authenticated = await authenticate(reason: "Empty Trash")
        guard authenticated else { return false }

        let script = """
        tell application "Finder"
            empty trash
        end tell
        """
        runAppleScript(script)
        return true
    }

    func showDesktop() {
        let script = """
        tell application "System Events"
            set visible of every process to true
        end tell
        tell application "Finder" to activate
        """
        runAppleScript(script)
    }

    func minimizeAllWindows() {
        let script = """
        tell application "System Events"
            tell process "Finder"
                set miniaturized of every window to true
            end tell
        end tell
        """
        runAppleScript(script)
    }

    func authenticate(reason: String) async -> Bool {
        await withCheckedContinuation { continuation in
            let context = LAContext()
            context.localizedReason = reason

            context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            ) { success, error in
                if !success {
                    if let laError = error as? LAError,
                       laError.code == .biometryNotAvailable {
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

    func openApplication(named name: String) async -> Bool {
        let workspace = NSWorkspace.shared
        let apps = workspace.runningApplications

        if let app = apps.first(where: {
            $0.localizedName?.lowercased().contains(name.lowercased()) == true
        }) {
            return await MainActor.run {
                app.activate()
                return true
            }
        }

        if let appURL = workspace.urlForApplication(withBundleIdentifier: name) {
            return await openApplication(at: appURL)
        }

        for app in workspace.allApplications {
            if app.localizedName?.lowercased().contains(name.lowercased()) == true {
                return await openApplication(at: app.url!)
            }
        }

        return false
    }

    private func openApplication(at url: URL) async -> Bool {
        await withCheckedContinuation { continuation in
            let config = NSWorkspace.OpenConfiguration()
            config.activates = true

            NSWorkspace.shared.openApplication(at: url, configuration: config) { app, error in
                continuation.resume(returning: error == nil && app != nil)
            }
        }
    }

    func executeShellCommand(_ command: String, authenticated: Bool = true) async -> ShellResult {
        if authenticated {
            let verified = await authenticate(reason: "Run shell command: \(command.prefix(50))")
            guard verified else {
                return ShellResult(success: false, output: "", error: "Authentication failed")
            }
        }

        if !isCommandSafe(command) {
            return ShellResult(success: false, output: "", error: "Command blocked for security")
        }

        return await runCommand(command)
    }

    private func isCommandSafe(_ command: String) -> Bool {
        let blockedPatterns = [
            "rm -rf /",
            "rm -rf ~",
            "dd if=",
            "> /dev/sda",
            "mkfs",
            ":(){:|:&};:",
            "curl.*|sh",
            "wget.*|sh",
            "nc -e /bin/sh",
            "eval \\$\\(",
            "chmod -R 777",
            "&& rm -rf",
        ]

        let lowercased = command.lowercased()
        for pattern in blockedPatterns {
            if lowercased.contains(pattern) {
                return false
            }
        }
        return true
    }

    private func runCommand(_ command: String) async -> ShellResult {
        await withCheckedContinuation { continuation in
            let task = Process()
            task.executableURL = URL(fileURLWithPath: "/bin/bash")
            task.arguments = ["-c", command]

            let outputPipe = Pipe()
            let errorPipe = Pipe()
            task.standardOutput = outputPipe
            task.standardError = errorPipe

            do {
                try task.run()
                task.waitUntilExit()

                let outputData = outputPipe.fileHandleForReading.readDataToEndOfFile()
                let errorData = errorPipe.fileHandleForReading.readDataToEndOfFile()

                let output = String(data: outputData, encoding: .utf8) ?? ""
                let error = String(data: errorData, encoding: .utf8) ?? ""

                continuation.resume(returning: ShellResult(
                    success: task.terminationStatus == 0,
                    output: output,
                    error: error.isEmpty ? nil : error
                ))
            } catch {
                continuation.resume(returning: ShellResult(
                    success: false,
                    output: "",
                    error: error.localizedDescription
                ))
            }
        }
    }

    private func runAppleScript(_ script: String) -> String? {
        var error: NSDictionary?
        if let result = NSAppleScript(source: script)?.executeAndReturnError(&error) {
            return result.stringValue
        }
        return nil
    }

    private func runShellCommand(_ command: String) -> String? {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/bash")
        task.arguments = ["-c", command]

        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = pipe

        do {
            try task.run()
            task.waitUntilExit()

            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            return String(data: data, encoding: .utf8)
        } catch {
            return nil
        }
    }
}

struct ShellResult {
    let success: Bool
    let output: String
    let error: String?
}

extension NSWorkspace {
    func openApplicationWithTouchID(at url: URL, reason: String) async -> Bool {
        let authenticated = await SystemControlService.shared.authenticate(reason: reason)
        guard authenticated else { return false }

        return await withCheckedContinuation { continuation in
            let config = NSWorkspace.OpenConfiguration()
            config.activates = true

            NSWorkspace.shared.openApplication(at: url, configuration: config) { app, error in
                continuation.resume(returning: error == nil)
            }
        }
    }
}
