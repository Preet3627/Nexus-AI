import Foundation

public final class OpenAIService: LLMProviderService {
    public let name = "OpenAI"
    public var isAvailable: Bool = false

    private let config: LLMProvider.ProviderConfig
    private let session: URLSession

    public init(config: LLMProvider.ProviderConfig) {
        self.config = config
        self.isAvailable = config.apiKey != nil
        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = 60
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
                    // Handle error
                }
                continuation.finish()
            }
        }
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
        sessionConfig.timeoutIntervalForRequest = 60
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
