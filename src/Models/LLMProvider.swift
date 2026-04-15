import Foundation

public struct LLMProvider: Identifiable, Codable {
    public let id: String
    public var name: String
    public var type: ProviderType
    public var isEnabled: Bool
    public var config: ProviderConfig

    public enum ProviderType: String, Codable {
        case ollama
        case openai
        case anthropic
        case google
        case groq
        case openrouter
    }

    public struct ProviderConfig: Codable {
        public var url: String?
        public var apiKey: String?
        public var model: String
        public var temperature: Double?
        public var maxTokens: Int?

        public init(
            url: String? = nil,
            apiKey: String? = nil,
            model: String = "llama3",
            temperature: Double? = 0.7,
            maxTokens: Int? = 4096
        ) {
            self.url = url
            self.apiKey = apiKey
            self.model = model
            self.temperature = temperature
            self.maxTokens = maxTokens
        }
    }

    public init(
        id: String = UUID().uuidString,
        name: String,
        type: ProviderType,
        isEnabled: Bool = false,
        config: ProviderConfig
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.isEnabled = isEnabled
        self.config = config
    }

    public static let ollama = LLMProvider(
        name: "Ollama",
        type: .ollama,
        isEnabled: true,
        config: ProviderConfig(
            url: "http://localhost:11434",
            model: "llama3"
        )
    )
}
