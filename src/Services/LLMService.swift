import Foundation

public protocol LLMProviderService: AnyObject {
    var name: String { get }
    var isAvailable: Bool { get }
    
    func chat(messages: [Message]) async throws -> Message
    func streamChat(messages: [Message]) -> AsyncStream<String>
    func chatWithTools(messages: [Message], tools: [[String: Any]]) async throws -> LLMResponse
}

public struct LLMResponse {
    public let content: String
    public let toolCalls: [ToolCall]
    public let stopReason: StopReason
    
    public init(content: String, toolCalls: [ToolCall] = [], stopReason: StopReason = .end_turn) {
        self.content = content
        self.toolCalls = toolCalls
        self.stopReason = stopReason
    }
}

public struct ToolCall: Codable, Identifiable {
    public let id: String
    public let name: String
    public let input: [String: AnyCodable]
    
    public init(id: String, name: String, input: [String: AnyCodable]) {
        self.id = id
        self.name = name
        self.input = input
    }
    
    public var parameters: [String: Any] {
        input.mapValues { $0.value }
    }
}

public enum StopReason: String, Codable {
    case end_turn
    case tool_use
    case stop_sequence
}

public struct AnyCodable: Codable {
    public let value: Any
    
    public init(_ value: Any) {
        self.value = value
    }
    
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let intVal = try? container.decode(Int.self) {
            value = intVal
        } else if let doubleVal = try? container.decode(Double.self) {
            value = doubleVal
        } else if let boolVal = try? container.decode(Bool.self) {
            value = boolVal
        } else if let stringVal = try? container.decode(String.self) {
            value = stringVal
        } else if let arrayVal = try? container.decode([AnyCodable].self) {
            value = arrayVal.map { $0.value }
        } else if let dictVal = try? container.decode([String: AnyCodable].self) {
            value = dictVal.mapValues { $0.value }
        } else {
            value = ""
        }
    }
    
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let intVal as Int:
            try container.encode(intVal)
        case let doubleVal as Double:
            try container.encode(doubleVal)
        case let boolVal as Bool:
            try container.encode(boolVal)
        case let stringVal as String:
            try container.encode(stringVal)
        case let arrayVal as [Any]:
            try container.encode(arrayVal.map { AnyCodable($0) })
        case let dictVal as [String: Any]:
            try container.encode(dictVal.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

public final class OpenAIService: LLMProviderService {
    public let name = "OpenAI"
    public var isAvailable: Bool = false
    
    private let config: LLMProvider.ProviderConfig
    private let session: URLSession
    
    public init(config: LLMProvider.ProviderConfig) {
        self.config = config
        self.isAvailable = config.apiKey != nil
        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = 120
        self.session = URLSession(configuration: sessionConfig)
    }
    
    public func chat(messages: [Message]) async throws -> Message {
        guard let apiKey = config.apiKey else {
            throw OpenAIError.apiKeyMissing
        }
        
        let url = URL(string: "https://api.openai.com/v1/chat/completions")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let body: [String: Any] = [
            "model": config.model,
            "messages": messages.map { msg in
                [
                    "role": msg.role.rawValue,
                    "content": msg.content
                ]
            },
            "temperature": config.temperature ?? 0.7,
            "max_tokens": config.maxTokens ?? 4096
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw OpenAIError.requestFailed
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let choices = json?["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw OpenAIError.invalidResponse
        }
        
        return Message(role: .assistant, content: content)
    }
    
    public func streamChat(messages: [Message]) -> AsyncStream<String> {
        AsyncStream { continuation in
            Task {
                guard let apiKey = self.config.apiKey else {
                    continuation.finish()
                    return
                }
                
                let url = URL(string: "https://api.openai.com/v1/chat/completions")!
                
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
                
                let body: [String: Any] = [
                    "model": self.config.model,
                    "messages": messages.map { msg in
                        [
                            "role": msg.role.rawValue,
                            "content": msg.content
                        ]
                    },
                    "stream": true
                ]
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
                
                do {
                    let (bytes, _) = try await self.session.bytes(for: request)
                    
                    for try await line in bytes.lines {
                        if line.hasPrefix("data: ") {
                            let jsonString = String(line.dropFirst(6))
                            if jsonString == "[DONE]" { break }
                            if let data = jsonString.data(using: .utf8),
                               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                               let choices = json["choices"] as? [[String: Any]],
                               let delta = choices.first?["delta"] as? [String: Any],
                               let content = delta["content"] as? String {
                                continuation.yield(content)
                            }
                        }
                    }
                } catch {
                    // Handle error silently
                }
                continuation.finish()
            }
        }
    }
    
    public func chatWithTools(messages: [Message], tools: [[String: Any]]) async throws -> LLMResponse {
        guard let apiKey = config.apiKey else {
            throw OpenAIError.apiKeyMissing
        }
        
        let url = URL(string: "https://api.openai.com/v1/chat/completions")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let body: [String: Any] = [
            "model": config.model,
            "messages": messages.map { msg in
                [
                    "role": msg.role.rawValue,
                    "content": msg.content
                ]
            },
            "tools": tools,
            "tool_choice": "auto",
            "temperature": config.temperature ?? 0.7,
            "max_tokens": config.maxTokens ?? 4096
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw OpenAIError.requestFailed
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let choices = json?["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any] else {
            throw OpenAIError.invalidResponse
        }
        
        var content = message["content"] as? String ?? ""
        var toolCalls: [ToolCall] = []
        
        if let calls = message["tool_calls"] as? [[String: Any]] {
            for call in calls {
                if let id = call["id"] as? String,
                   let func_ = call["function"] as? [String: Any],
                   let name = func_["name"] as? String,
                   let args = func_["arguments"] as? String {
                    
                    if let argsData = args.data(using: .utf8),
                       let argsJson = try? JSONSerialization.jsonObject(with: argsData) as? [String: Any] {
                        let params = argsJson.mapValues { AnyCodable($0) }
                        toolCalls.append(ToolCall(id: id, name: name, input: params))
                    }
                }
            }
            
            if !toolCalls.isEmpty {
                content = ""
            }
        }
        
        let reason = firstChoice["finish_reason"] as? String ?? "end_turn"
        let stopReason: StopReason = reason == "tool_calls" ? .tool_use : .end_turn
        
        return LLMResponse(content: content, toolCalls: toolCalls, stopReason: stopReason)
    }
    
    public enum OpenAIError: Error, LocalizedError {
        case apiKeyMissing
        case requestFailed
        case invalidResponse
        
        public var errorDescription: String? {
            switch self {
            case .apiKeyMissing: return "OpenAI API key is missing"
            case .requestFailed: return "Request to OpenAI failed"
            case .invalidResponse: return "Invalid response from OpenAI"
            }
        }
    }
}

public final class AnthropicService: LLMProviderService {
    public let name = "Anthropic"
    public var isAvailable: Bool = false
    
    private let config: LLMProvider.ProviderConfig
    private let session: URLSession
    
    public init(config: LLMProvider.ProviderConfig) {
        self.config = config
        self.isAvailable = config.apiKey != nil
        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = 120
        self.session = URLSession(configuration: sessionConfig)
    }
    
    public func chat(messages: [Message]) async throws -> Message {
        guard let apiKey = config.apiKey else {
            throw AnthropicError.apiKeyMissing
        }
        
        let url = URL(string: "https://api.anthropic.com/v1/messages")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        
        let body: [String: Any] = [
            "model": config.model,
            "messages": messages.map { msg in
                [
                    "role": msg.role.rawValue,
                    "content": msg.content
                ]
            },
            "max_tokens": config.maxTokens ?? 4096
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AnthropicError.requestFailed
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let content = json?["content"] as? [[String: Any]],
              let firstBlock = content.first,
              let text = firstBlock["text"] as? String else {
            throw AnthropicError.invalidResponse
        }
        
        return Message(role: .assistant, content: text)
    }
    
    public func streamChat(messages: [Message]) -> AsyncStream<String> {
        AsyncStream { continuation in
            continuation.finish()
        }
    }
    
    public func chatWithTools(messages: [Message], tools: [[String: Any]]) async throws -> LLMResponse {
        guard let apiKey = config.apiKey else {
            throw AnthropicError.apiKeyMissing
        }
        
        let url = URL(string: "https://api.anthropic.com/v1/messages")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        
        let systemTools = tools.flatMap { tool -> [[String: Any]] in
            guard let name = tool["name"] as? String,
                  let description = tool["description"] as? String,
                  let schema = tool["input_schema"] as? [String: Any] else {
                return []
            }
            return [[
                "name": name,
                "description": description,
                "input_schema": schema
            ]]
        }
        
        let body: [String: Any] = [
            "model": config.model,
            "messages": messages.map { msg in
                [
                    "role": msg.role.rawValue,
                    "content": msg.content
                ]
            },
            "tools": systemTools,
            "max_tokens": config.maxTokens ?? 4096
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw AnthropicError.requestFailed
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let content = json?["content"] as? [[String: Any]] else {
            throw AnthropicError.invalidResponse
        }
        
        var assistantContent = ""
        var toolCalls: [ToolCall] = []
        
        for block in content {
            if let type = block["type"] as? String {
                if type == "text", let text = block["text"] as? String {
                    assistantContent += text
                } else if type == "tool_use", let toolUse = block as? [String: Any] {
                    if let id = toolUse["id"] as? String,
                       let name = toolUse["name"] as? String,
                       let inputStr = toolUse["input"] as? String,
                       let inputData = inputStr.data(using: .utf8),
                       let inputJson = try? JSONSerialization.jsonObject(with: inputData) as? [String: Any] {
                        let params = inputJson.mapValues { AnyCodable($0) }
                        toolCalls.append(ToolCall(id: id, name: name, input: params))
                    }
                }
            }
        }
        
        let stopReason: StopReason = toolCalls.isEmpty ? .end_turn : .tool_use
        
        return LLMResponse(content: assistantContent, toolCalls: toolCalls, stopReason: stopReason)
    }
    
    public enum AnthropicError: Error, LocalizedError {
        case apiKeyMissing
        case requestFailed
        case invalidResponse
        
        public var errorDescription: String? {
            switch self {
            case .apiKeyMissing: return "Anthropic API key is missing"
            case .requestFailed: return "Request to Anthropic failed"
            case .invalidResponse: return "Invalid response from Anthropic"
            }
        }
    }
}
