import Foundation

public final class OllamaService: LLMProviderService {
    public let name = "Ollama"
    public var isAvailable: Bool = true

    private let config: LLMProvider.ProviderConfig
    private let session: URLSession

    public init(config: LLMProvider.ProviderConfig) {
        self.config = config
        let sessionConfig = URLSessionConfiguration.default
        sessionConfig.timeoutIntervalForRequest = 60
        self.session = URLSession(configuration: sessionConfig)
    }

    public func chat(messages: [Message]) async throws -> Message {
        let url = URL(string: "\(config.url ?? "http://localhost:11434")/api/chat")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body: [String: Any] = [
            "model": config.model,
            "messages": messages.map { msg in
                [
                    "role": msg.role.rawValue,
                    "content": msg.content
                ]
            },
            "stream": false
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw OllamaError.requestFailed
        }

        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let messageContent = json?["message"] as? [String: Any],
              let content = messageContent["content"] as? String else {
            throw OllamaError.invalidResponse
        }

        return Message(role: .assistant, content: content)
    }

    public func streamChat(messages: [Message]) -> AsyncStream<String> {
        AsyncStream { continuation in
            Task {
                do {
                    let url = URL(string: "\(config.url ?? "http://localhost:11434")/api/chat")!
                    
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

                    let body: [String: Any] = [
                        "model": config.model,
                        "messages": messages.map { msg in
                            [
                                "role": msg.role.rawValue,
                                "content": msg.content
                            ]
                        },
                        "stream": true
                    ]
                    request.httpBody = try JSONSerialization.data(withJSONObject: body)

                    let (bytes, _) = try await session.bytes(for: request)

                    for try await line in bytes.lines {
                        if line.isEmpty { continue }
                        if let data = line.data(using: .utf8),
                           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                           let message = json["message"] as? [String: Any],
                           let content = message["content"] as? String {
                            continuation.yield(content)
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish()
                }
            }
        }
    }

    public enum OllamaError: Error, LocalizedError {
        case requestFailed
        case invalidResponse

        public var errorDescription: String? {
            switch self {
            case .requestFailed: return "Request to Ollama failed"
            case .invalidResponse: return "Invalid response from Ollama"
            }
        }
    }
}
