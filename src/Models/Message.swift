import Foundation

public struct Message: Identifiable, Codable, Equatable {
    public let id: String
    public let role: Role
    public var content: String
    public var thinkingContent: String?
    public var quotedText: String?
    public var imagePaths: [String]?
    public let timestamp: Date
    public var isStreaming: Bool

    public enum Role: String, Codable {
        case user
        case assistant
        case system
    }

    public init(
        id: String = UUID().uuidString,
        role: Role,
        content: String,
        thinkingContent: String? = nil,
        quotedText: String? = nil,
        imagePaths: [String]? = nil,
        timestamp: Date = Date(),
        isStreaming: Bool = false
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.thinkingContent = thinkingContent
        self.quotedText = quotedText
        self.imagePaths = imagePaths
        self.timestamp = timestamp
        self.isStreaming = isStreaming
    }
}

public struct Conversation: Identifiable, Codable {
    public let id: String
    public var title: String
    public var messages: [Message]
    public let createdAt: Date
    public var updatedAt: Date

    public init(
        id: String = UUID().uuidString,
        title: String = "New Chat",
        messages: [Message] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.messages = messages
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
