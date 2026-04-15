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
    @Published public var executionLog: [ExecutionRecord] = []
    
    private let providerManager: LLMProviderManager
    private let storage: SecureStorageService
    private let actionManager: ActionChainManager
    private var currentConversation: Conversation?
    private let maxIterations = 5
    
    public init(
        providerManager: LLMProviderManager = LLMProviderManager(),
        storage: SecureStorageService = SecureStorageService(),
        actionManager: ActionChainManager = ActionChainManager()
    ) {
        self.providerManager = providerManager
        self.storage = storage
        self.actionManager = actionManager
        
        setupSystemPrompt()
    }
    
    private func setupSystemPrompt() {
        let systemPrompt = """
        You are Nexus, a helpful AI assistant on macOS. You can help users with:
        
        - Answering questions and having conversations
        - Writing and analyzing code
        - Controlling system settings (brightness, volume)
        - Opening applications
        - Taking screenshots
        - Managing clipboard
        - Creating automations
        
        When a user asks you to perform an action, use the available tools. Be concise and helpful.
        
        Available tools:
        - shell: Execute shell commands (requires careful input validation)
        - brightness: Set display brightness (0.0-1.0)
        - volume: Set system volume (0.0-1.0)
        - open_app: Open applications by name
        - screenshot: Capture screenshots
        - clipboard: Read/write clipboard
        - notification: Show system notifications
        - automation: Create and manage automations
        """
        
        let systemMessage = Message(role: .system, content: systemPrompt)
        messages = [systemMessage]
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
            
            let tools = actionManager.getToolDefinitions()
            
            var iterationCount = 0
            var continueLoop = true
            
            while continueLoop && iterationCount < maxIterations {
                iterationCount += 1
                
                let response = try await service.chatWithTools(
                    messages: messages,
                    tools: tools
                )
                
                if !response.content.isEmpty {
                    let assistantMessage = Message(role: .assistant, content: response.content)
                    messages.append(assistantMessage)
                }
                
                if response.toolCalls.isEmpty {
                    continueLoop = false
                } else {
                    for toolCall in response.toolCalls {
                        await handleToolCall(toolCall, service: service, tools: tools)
                    }
                }
                
                if !response.content.isEmpty || !response.toolCalls.isEmpty {
                    continueLoop = false
                }
            }
            
        } catch {
            let errorMessage = Message(role: .assistant, content: "Error: \(error.localizedDescription)")
            messages.append(errorMessage)
        }
        
        isGenerating = false
    }
    
    private func handleToolCall(_ toolCall: ToolCall, service: LLMProviderService, tools: [[String: Any]]) async {
        let toolResult = await actionManager.executeAction(toolCall.name, parameters: toolCall.parameters)
        
        executionLog.insert(ExecutionRecord(
            id: UUID().uuidString,
            actionId: toolCall.name,
            actionName: toolCall.name,
            parameters: toolCall.parameters,
            result: toolResult,
            timestamp: Date()
        ), at: 0)
        
        let resultMessage = Message(
            role: .user,
            content: """
            Tool: \(toolCall.name)
            Result: \(toolResult.output)
            \(toolResult.error != nil ? "Error: \(toolResult.error!)" : "")
            """
        )
        messages.append(resultMessage)
    }
    
    public func cancelGeneration() {
        isGenerating = false
        if let index = messages.lastIndex(where: { $0.isStreaming }) {
            messages[index].isStreaming = false
        }
    }
    
    public func clearConversation() {
        messages = []
        executionLog = []
        setupSystemPrompt()
    }
    
    public func newConversation() {
        saveCurrentConversation()
        messages = []
        executionLog = []
        setupSystemPrompt()
        currentConversation = nil
    }
    
    private func saveCurrentConversation() {
        guard !messages.isEmpty else { return }
        var conversation = currentConversation ?? Conversation()
        conversation.messages = messages.filter { $0.role != .system }
        conversation.updatedAt = Date()
        if conversation.title == "New Chat", let first = conversation.messages.first {
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
        case toolExecutionFailed
        
        public var errorDescription: String? {
            switch self {
            case .noProvider: return "No LLM provider configured"
            case .sendFailed: return "Failed to send message"
            case .toolExecutionFailed: return "Failed to execute tool"
            }
        }
    }
}
