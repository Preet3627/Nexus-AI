import Foundation
import SwiftUI
import Combine

@MainActor
public final class ChatViewModel: ObservableObject {
    @Published public var messages: [Message] = []
    @Published public var conversations: [Conversation] = []
    @Published public var isGenerating: Bool = false
    @Published public var inputText: String = ""
    @Published public var quotedText: String?

    private let providerManager: LLMProviderManager
    private let storage: SecureStorageService
    private var currentConversation: Conversation?

    public init(
        providerManager: LLMProviderManager = LLMProviderManager(),
        storage: SecureStorageService = SecureStorageService()
    ) {
        self.providerManager = providerManager
        self.storage = storage
    }

    public func sendMessage() async {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        let userMessage = Message(
            role: .user,
            content: text,
            quotedText: quotedText
        )
        messages.append(userMessage)
        inputText = ""
        quotedText = nil
        isGenerating = true

        do {
            guard let provider = providerManager.activeProvider,
                  let service = providerManager.createService(for: provider) else {
                throw ChatError.noProvider
            }

            let assistantMessage = Message(
                role: .assistant,
                content: "",
                isStreaming: true
            )
            messages.append(assistantMessage)

            var fullResponse = ""
            for await token in service.streamChat(messages: messages.dropLast()) {
                fullResponse += token
                if let index = messages.lastIndex(where: { $0.id == assistantMessage.id }) {
                    messages[index].content = fullResponse
                }
            }

            if let index = messages.lastIndex(where: { $0.id == assistantMessage.id }) {
                messages[index].isStreaming = false
            }
        } catch {
            if let index = messages.lastIndex(where: { $0.isStreaming }) {
                messages[index].content = "Error: \(error.localizedDescription)"
                messages[index].isStreaming = false
            }
        }

        isGenerating = false
    }

    public func cancelGeneration() {
        isGenerating = false
        if let index = messages.lastIndex(where: { $0.isStreaming }) {
            messages[index].isStreaming = false
        }
    }

    public func clearConversation() {
        messages = []
        currentConversation = nil
    }

    public func newConversation() {
        saveCurrentConversation()
        messages = []
        currentConversation = nil
    }

    private func saveCurrentConversation() {
        guard !messages.isEmpty else { return }
        var conversation = currentConversation ?? Conversation()
        conversation.messages = messages
        conversation.updatedAt = Date()
        if conversation.title == "New Chat", let first = messages.first {
            conversation.title = String(first.content.prefix(50))
        }
        currentConversation = conversation
        
        if let index = conversations.firstIndex(where: { $0.id == conversation.id }) {
            conversations[index] = conversation
        } else {
            conversations.insert(conversation, at: 0)
        }
    }

    public func loadConversation(_ conversation: Conversation) {
        saveCurrentConversation()
        currentConversation = conversation
        messages = conversation.messages
    }

    public func deleteConversation(_ conversation: Conversation) {
        conversations.removeAll { $0.id == conversation.id }
    }

    public enum ChatError: Error, LocalizedError {
        case noProvider
        case sendFailed

        public var errorDescription: String? {
            switch self {
            case .noProvider: return "No LLM provider configured"
            case .sendFailed: return "Failed to send message"
            }
        }
    }
}
