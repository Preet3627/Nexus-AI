import SwiftUI

@main
struct NexusApp: App {
    @StateObject private var chatViewModel = ChatViewModel()
    @StateObject private var settingsViewModel = SettingsViewModel()
    @State private var isOverlayVisible = false
    @State private var isAuthenticated = false

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(chatViewModel)
                .environmentObject(settingsViewModel)
                .frame(minWidth: 400, maxWidth: 600, minHeight: 80, maxHeight: 700)
                .background(Color(nsColor: .windowBackgroundColor))
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) {}
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var chatViewModel: ChatViewModel
    @EnvironmentObject var settingsViewModel: SettingsViewModel

    var body: some View {
        ZStack {
            if chatViewModel.messages.isEmpty {
                collapsedView
            } else {
                expandedView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var collapsedView: some View {
        VStack(spacing: 0) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundColor(.purple)
                Text("Ask Nexus anything...")
                    .foregroundColor(.secondary)
                Spacer()
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .cornerRadius(12)
        }
        .padding()
    }

    private var expandedView: some View {
        VStack(spacing: 0) {
            headerView
            Divider()
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(chatViewModel.messages) { message in
                            MessageBubbleView(message: message)
                                .id(message.id)
                        }
                    }
                    .padding()
                }
                .onChange(of: chatViewModel.messages.count) { _, _ in
                    if let lastId = chatViewModel.messages.last?.id {
                        withAnimation {
                            proxy.scrollTo(lastId, anchor: .bottom)
                        }
                    }
                }
            }
            inputView
        }
    }

    private var headerView: some View {
        HStack {
            Button(action: { chatViewModel.clearConversation() }) {
                Image(systemName: "trash")
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
            
            Spacer()
            
            Button(action: { chatViewModel.newConversation() }) {
                Image(systemName: "plus")
                    .foregroundColor(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }

    private var inputView: some View {
        HStack(spacing: 12) {
            Image(systemName: "sparkles")
                .foregroundColor(.purple)
            
            TextField("Reply...", text: $chatViewModel.inputText)
                .textFieldStyle(.plain)
                .onSubmit {
                    Task { await chatViewModel.sendMessage() }
                }
            
            if chatViewModel.isGenerating {
                Button(action: { chatViewModel.cancelGeneration() }) {
                    Image(systemName: "stop.fill")
                        .foregroundColor(.red)
                }
                .buttonStyle(.plain)
            } else {
                Button(action: { Task { await chatViewModel.sendMessage() } }) {
                    Image(systemName: "arrow.up.circle.fill")
                        .foregroundColor(.purple)
                }
                .buttonStyle(.plain)
                .disabled(chatViewModel.inputText.isEmpty)
            }
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
        .padding()
    }
}

struct MessageBubbleView: View {
    let message: Message

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            if message.role == .assistant {
                Image(systemName: "sparkles")
                    .foregroundColor(.purple)
                    .frame(width: 24, height: 24)
            }

            VStack(alignment: .leading, spacing: 4) {
                if let quoted = message.quotedText {
                    Text(""\(quoted)"")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(8)
                        .background(Color.secondary.opacity(0.1))
                        .cornerRadius(8)
                }

                Text(message.content)
                    .font(.body)
                    + (message.isStreaming ? Text("|").foregroundColor(.purple) : Text(""))
            }

            Spacer()

            if message.role == .user {
                Image(systemName: "person.fill")
                    .foregroundColor(.blue)
                    .frame(width: 24, height: 24)
            }
        }
        .padding(12)
        .background(message.role == .user ? Color.purple.opacity(0.2) : Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
    }
}
