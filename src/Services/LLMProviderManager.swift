import Foundation

public protocol LLMProviderService {
    var name: String { get }
    var isAvailable: Bool { get }
    
    func chat(messages: [Message]) async throws -> Message
    func streamChat(messages: [Message]) -> AsyncStream<String>
}

public final class LLMProviderManager: ObservableObject {
    @Published public private(set) var providers: [LLMProvider] = []
    @Published public var activeProviderId: String?

    private let storage: SecureStorageService

    public init(storage: SecureStorageService = SecureStorageService()) {
        self.storage = storage
        loadProviders()
    }

    private func loadProviders() {
        providers = [
            .ollama,
            LLMProvider(
                name: "OpenAI",
                type: .openai,
                config: ProviderConfig(model: "gpt-4")
            ),
            LLMProvider(
                name: "Anthropic",
                type: .anthropic,
                config: ProviderConfig(model: "claude-3-5-sonnet")
            ),
            LLMProvider(
                name: "Google",
                type: .google,
                config: ProviderConfig(model: "gemini-pro")
            )
        ]
        activeProviderId = providers.first { $0.isEnabled }?.id
    }

    public var activeProvider: LLMProvider? {
        providers.first { $0.id == activeProviderId }
    }

    public func setProvider(_ provider: LLMProvider) {
        providers = providers.map { p in
            var updated = p
            updated.isEnabled = p.id == provider.id
            return updated
        }
        activeProviderId = provider.id
    }

    public func createService(for provider: LLMProvider) -> LLMProviderService? {
        switch provider.type {
        case .ollama:
            return OllamaService(config: provider.config)
        case .openai:
            return OpenAIService(config: provider.config)
        case .anthropic:
            return AnthropicService(config: provider.config)
        default:
            return nil
        }
    }
}
