import Foundation
import SwiftUI

public struct ActionTool: Identifiable, Codable {
    public let id: String
    public let name: String
    public let description: String
    public let category: ActionCategory
    public let parameters: [ActionParameter]
    public let examples: [String]
    public let riskLevel: RiskLevel
    
    public init(
        id: String,
        name: String,
        description: String,
        category: ActionCategory,
        parameters: [ActionParameter] = [],
        examples: [String] = [],
        riskLevel: RiskLevel = .medium
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.category = category
        self.parameters = parameters
        self.examples = examples
        self.riskLevel = riskLevel
    }
}

public struct ActionParameter: Codable {
    public let name: String
    public let type: ParameterType
    public let description: String
    public let required: Bool
    public let defaultValue: String?
    
    public init(
        name: String,
        type: ParameterType,
        description: String,
        required: Bool = true,
        defaultValue: String? = nil
    ) {
        self.name = name
        self.type = type
        self.description = description
        self.required = required
        self.defaultValue = defaultValue
    }
}

public enum ParameterType: String, Codable {
    case string
    case number
    case boolean
    case array
    case object
}

public enum ActionCategory: String, Codable, CaseIterable {
    case system = "System"
    case application = "Application"
    case file = "File"
    case network = "Network"
    case media = "Media"
    case automation = "Automation"
    case ai = "AI"
}

public enum RiskLevel: String, Codable, CaseIterable {
    case low = "low"
    case medium = "medium"
    case high = "high"
    case critical = "critical"
    
    public var color: Color {
        switch self {
        case .low: return .green
        case .medium: return .yellow
        case .high: return .orange
        case .critical: return .red
        }
    }
}

public struct ActionResult: Codable {
    public let success: Bool
    public let output: String
    public let error: String?
    public let actionId: String
    
    public init(success: Bool, output: String, error: String? = nil, actionId: String) {
        self.success = success
        self.output = output
        self.error = error
        self.actionId = actionId
    }
}

public protocol ActionExecutor {
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult
}

@MainActor
public final class ActionChainManager: ObservableObject {
    @Published public private(set) var availableTools: [ActionTool] = []
    @Published public private(set) var executionHistory: [ExecutionRecord] = []
    
    private let executors: [String: ActionExecutor]
    private let systemControl: SystemControlService
    
    public init(systemControl: SystemControlService = SystemControlService()) {
        self.systemControl = systemControl
        self.executors = [
            "shell": ShellExecutor(),
            "brightness": BrightnessExecutor(systemControl: systemControl),
            "volume": VolumeExecutor(systemControl: systemControl),
            "open_app": AppExecutor(),
            "screenshot": ScreenshotExecutor(),
            "clipboard": ClipboardExecutor(),
            "automation": AutomationExecutor(),
            "notification": NotificationExecutor(),
        ]
        registerDefaultTools()
    }
    
    private func registerDefaultTools() {
        availableTools = [
            ActionTool(
                id: "shell",
                name: "shell",
                description: "Execute a shell command in Terminal. Use for system operations, file management, and running scripts.",
                category: .system,
                parameters: [
                    ActionParameter(name: "command", type: .string, description: "The shell command to execute", required: true),
                    ActionParameter(name: "workingDirectory", type: .string, description: "Optional working directory", required: false)
                ],
                examples: [
                    "ls -la",
                    "git status",
                    "mkdir -p ~/Projects",
                    "open -a Safari"
                ],
                riskLevel: .high
            ),
            ActionTool(
                id: "brightness",
                name: "brightness",
                description: "Control display brightness. Values from 0.0 (darkest) to 1.0 (brightest).",
                category: .system,
                parameters: [
                    ActionParameter(name: "level", type: .number, description: "Brightness level (0.0-1.0)", required: true)
                ],
                examples: ["0.5", "0.8", "1.0"],
                riskLevel: .low
            ),
            ActionTool(
                id: "volume",
                name: "volume",
                description: "Control system volume. Values from 0.0 (mute) to 1.0 (maximum).",
                category: .system,
                parameters: [
                    ActionParameter(name: "level", type: .number, description: "Volume level (0.0-1.0)", required: true),
                    ActionParameter(name: "muted", type: .boolean, description: "Mute the system", required: false)
                ],
                examples: ["0.5", "0.0 (mute)", "0.8"],
                riskLevel: .low
            ),
            ActionTool(
                id: "open_app",
                name: "open_app",
                description: "Open an application by name or bundle identifier.",
                category: .application,
                parameters: [
                    ActionParameter(name: "name", type: .string, description: "App name (e.g., 'Safari', 'Chrome') or bundle ID", required: true)
                ],
                examples: ["Safari", "Chrome", "Slack", "Finder"],
                riskLevel: .medium
            ),
            ActionTool(
                id: "screenshot",
                name: "screenshot",
                description: "Capture a screenshot of the screen or a region.",
                category: .media,
                parameters: [
                    ActionParameter(name: "type", type: .string, description: "full, region, or window", required: false, defaultValue: "full"),
                    ActionParameter(name: "save", type: .boolean, description: "Save to file", required: false, defaultValue: "true")
                ],
                examples: ["full screenshot", "region selection", "capture window"],
                riskLevel: .low
            ),
            ActionTool(
                id: "clipboard",
                name: "clipboard",
                description: "Read from or write to the system clipboard.",
                category: .system,
                parameters: [
                    ActionParameter(name: "action", type: .string, description: "read or write", required: true),
                    ActionParameter(name: "content", type: .string, description: "Text to copy (for write action)", required: false)
                ],
                examples: ["read clipboard", "copy text to clipboard", "paste"],
                riskLevel: .low
            ),
            ActionTool(
                id: "notification",
                name: "notification",
                description: "Display a system notification with title and message.",
                category: .system,
                parameters: [
                    ActionParameter(name: "title", type: .string, description: "Notification title", required: true),
                    ActionParameter(name: "message", type: .string, description: "Notification body text", required: true)
                ],
                examples: ["Nexus Alert: Task complete", "Reminder: Meeting in 5 minutes"],
                riskLevel: .low
            ),
            ActionTool(
                id: "automation",
                name: "automation",
                description: "Create, run, or manage scheduled automations.",
                category: .automation,
                parameters: [
                    ActionParameter(name: "action", type: .string, description: "create, run, list, or delete", required: true),
                    ActionParameter(name: "name", type: .string, description: "Automation name", required: false),
                    ActionParameter(name: "schedule", type: .string, description: "Cron expression (e.g., '0 9 * * *' for daily 9am)", required: false),
                    ActionParameter(name: "command", type: .string, description: "Command to execute", required: false)
                ],
                examples: [
                    "create morning_brief at 9am",
                    "list automations",
                    "run morning_brief"
                ],
                riskLevel: .medium
            ),
        ]
    }
    
    public func getToolDefinitions() -> [[String: Any]] {
        return availableTools.map { tool in
            [
                "name": tool.name,
                "description": tool.description,
                "input_schema": [
                    "type": "object",
                    "properties": tool.parameters.reduce(into: [String: Any]()) { result, param in
                        result[param.name] = [
                            "type": param.type.rawValue,
                            "description": param.description
                        ]
                    },
                    "required": tool.parameters.filter { $0.required }.map { $0.name }
                ] as [String: Any]
            ]
        }
    }
    
    public func executeAction(_ actionId: String, parameters: [String: Any]) async -> ActionResult {
        guard let tool = availableTools.first(where: { $0.id == actionId }),
              let executor = executors[actionId] else {
            return ActionResult(
                success: false,
                output: "",
                error: "Unknown action: \(actionId)",
                actionId: actionId
            )
        }
        
        do {
            let result = try await executor.execute(tool, parameters: parameters)
            recordExecution(action: tool, parameters: parameters, result: result)
            return result
        } catch {
            let result = ActionResult(
                success: false,
                output: "",
                error: error.localizedDescription,
                actionId: actionId
            )
            recordExecution(action: tool, parameters: parameters, result: result)
            return result
        }
    }
    
    private func recordExecution(action: ActionTool, parameters: [String: Any], result: ActionResult) {
        let record = ExecutionRecord(
            id: UUID().uuidString,
            actionId: action.id,
            actionName: action.name,
            parameters: parameters,
            result: result,
            timestamp: Date()
        )
        executionHistory.insert(record, at: 0)
        if executionHistory.count > 100 {
            executionHistory.removeLast()
        }
    }
    
    public func parseActionFromText(_ text: String) -> (actionId: String, parameters: [String: Any])? {
        let lowercased = text.lowercased()
        
        for tool in availableTools {
            let patterns = [
                "\(tool.name.lowercased())",
                "set \(tool.name.lowercased())",
                "run \(tool.name.lowercased())",
                "execute \(tool.name.lowercased())",
                "call \(tool.name.lowercased())",
            ]
            
            for pattern in patterns {
                if lowercased.contains(pattern) {
                    var params: [String: Any] = [:]
                    extractParameters(from: text, for: tool, into: &params)
                    return (tool.id, params)
                }
            }
        }
        
        return nil
    }
    
    private func extractParameters(from text: String, for tool: ActionTool, into params: inout [String: Any]) {
        let numberPattern = #"(\d+\.?\d*)"#
        let stringPattern = #""([^"]+)""#
        
        for param in tool.parameters {
            switch param.type {
            case .number:
                if let match = text.range(of: numberPattern, options: .regularExpression) {
                    let numberStr = String(text[match])
                    if let number = Double(numberStr) {
                        params[param.name] = number
                    }
                }
            case .boolean:
                if text.contains("not ") || text.contains("don't ") || text.contains("without ") {
                    params[param.name] = false
                } else {
                    params[param.name] = true
                }
            case .string:
                if let match = text.range(of: stringPattern, options: .regularExpression) {
                    let quoted = String(text[match])
                    let content = quoted.dropFirst().dropLast()
                    params[param.name] = String(content)
                } else {
                    let words = text.components(separatedBy: " ").filter { !$0.isEmpty }
                    if let index = words.firstIndex(where: { $0.lowercased() == param.name.lowercased() }),
                       index + 1 < words.count {
                        params[param.name] = words[index + 1]
                    }
                }
            default:
                break
            }
            
            if params[param.name] == nil, let defaultValue = param.defaultValue {
                if param.type == .number {
                    params[param.name] = Double(defaultValue)
                } else {
                    params[param.name] = defaultValue
                }
            }
        }
    }
}

public struct ExecutionRecord: Identifiable {
    public let id: String
    public let actionId: String
    public let actionName: String
    public let parameters: [String: Any]
    public let result: ActionResult
    public let timestamp: Date
}

class ShellExecutor: ActionExecutor {
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        guard let command = parameters["command"] as? String else {
            throw ActionError.missingParameter("command")
        }
        
        let process = Process()
        let pipe = Pipe()
        
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-c", command]
        process.standardOutput = pipe
        process.standardError = pipe
        
        try process.run()
        process.waitUntilExit()
        
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        let output = String(data: data, encoding: .utf8) ?? ""
        
        return ActionResult(
            success: process.terminationStatus == 0,
            output: output,
            error: process.terminationStatus != 0 ? "Command failed with exit code \(process.terminationStatus)" : nil,
            actionId: action.id
        )
    }
}

class BrightnessExecutor: ActionExecutor {
    let systemControl: SystemControlService
    
    init(systemControl: SystemControlService) {
        self.systemControl = systemControl
    }
    
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        guard let level = parameters["level"] as? Double else {
            throw ActionError.missingParameter("level")
        }
        
        try await systemControl.setBrightness(level)
        
        return ActionResult(
            success: true,
            output: "Brightness set to \(Int(level * 100))%",
            actionId: action.id
        )
    }
}

class VolumeExecutor: ActionExecutor {
    let systemControl: SystemControlService
    
    init(systemControl: SystemControlService) {
        self.systemControl = systemControl
    }
    
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        if let muted = parameters["muted"] as? Bool, muted {
            try await systemControl.setMuted(true)
            return ActionResult(success: true, output: "Volume muted", actionId: action.id)
        }
        
        guard let level = parameters["level"] as? Double else {
            throw ActionError.missingParameter("level")
        }
        
        try await systemControl.setVolume(Float(level))
        
        return ActionResult(
            success: true,
            output: "Volume set to \(Int(level * 100))%",
            actionId: action.id
        )
    }
}

class AppExecutor: ActionExecutor {
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        guard let name = parameters["name"] as? String else {
            throw ActionError.missingParameter("name")
        }
        
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/open")
        process.arguments = ["-a", name]
        
        try process.run()
        process.waitUntilExit()
        
        return ActionResult(
            success: process.terminationStatus == 0,
            output: "Opened \(name)",
            error: process.terminationStatus != 0 ? "Failed to open \(name)" : nil,
            actionId: action.id
        )
    }
}

class ScreenshotExecutor: ActionExecutor {
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        let type = parameters["type"] as? String ?? "full"
        let save = parameters["save"] as? Bool ?? true
        
        var args = ["-c"]
        switch type {
        case "region":
            args = ["-i", "-s"]
        case "window":
            args = ["-w"]
        default:
            break
        }
        
        let process = Process()
        let pipe = Pipe()
        
        process.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        process.arguments = args + (save ? [NSHomeDirectory() + "/Desktop/screenshot_\(Date().timeIntervalSince1970).png"] : ["-"])
        process.standardOutput = pipe
        
        try process.run()
        process.waitUntilExit()
        
        return ActionResult(
            success: process.terminationStatus == 0,
            output: save ? "Screenshot saved to Desktop" : "Screenshot captured",
            actionId: action.id
        )
    }
}

class ClipboardExecutor: ActionExecutor {
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        let act = parameters["action"] as? String ?? "read"
        
        if act == "read" {
            let process = Process()
            let pipe = Pipe()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/pbpaste")
            process.standardOutput = pipe
            try process.run()
            process.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let content = String(data: data, encoding: .utf8) ?? ""
            
            return ActionResult(success: true, output: content, actionId: action.id)
        } else if let content = parameters["content"] as? String {
            let process = Process()
            process.executableURL = URL(fileURLWithPath: "/usr/bin/pbcopy")
            process.standardInput = Pipe()
            
            let inputPipe = process.standardInput as? Pipe
            inputPipe?.fileHandleForWriting.write(content.data(using: .utf8) ?? Data())
            inputPipe?.fileHandleForWriting.closeFile()
            
            try process.run()
            process.waitUntilExit()
            
            return ActionResult(success: true, output: "Copied to clipboard", actionId: action.id)
        }
        
        throw ActionError.invalidParameters("Unknown clipboard action")
    }
}

class AutomationExecutor: ActionExecutor {
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        let act = parameters["action"] as? String ?? "list"
        
        switch act {
        case "list":
            return ActionResult(success: true, output: "No automations configured", actionId: action.id)
        case "create":
            let name = parameters["name"] as? String ?? "unnamed"
            return ActionResult(success: true, output: "Created automation: \(name)", actionId: action.id)
        case "run":
            let name = parameters["name"] as? String ?? ""
            return ActionResult(success: true, output: "Running: \(name)", actionId: action.id)
        default:
            throw ActionError.invalidParameters("Unknown automation action")
        }
    }
}

class NotificationExecutor: ActionExecutor {
    func execute(_ action: ActionTool, parameters: [String: Any]) async throws -> ActionResult {
        let title = parameters["title"] as? String ?? "Nexus"
        let message = parameters["message"] as? String ?? ""
        
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", "display notification \"\(message)\" with title \"\(title)\""]
        
        try process.run()
        process.waitUntilExit()
        
        return ActionResult(
            success: process.terminationStatus == 0,
            output: "Notification shown",
            actionId: action.id
        )
    }
}

public enum ActionError: Error, LocalizedError {
    case missingParameter(String)
    case invalidParameters(String)
    case executionFailed(String)
    
    public var errorDescription: String? {
        switch self {
        case .missingParameter(let name):
            return "Missing required parameter: \(name)"
        case .invalidParameters(let reason):
            return "Invalid parameters: \(reason)"
        case .executionFailed(let reason):
            return "Execution failed: \(reason)"
        }
    }
}
