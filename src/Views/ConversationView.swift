import SwiftUI

struct ConversationView: View {
    @ObservedObject var viewModel: ChatViewModel
    @State private var scrollProxy: ScrollViewProxy?
    @State private var userScrolled = false
    @State private var showScrollToBottom = false
    @Binding var theme: NexusTheme

    var body: some View {
        VStack(spacing: 0) {
            headerView
            messagesScrollView
            AskBarView(
                inputText: $viewModel.inputText,
                onSubmit: { viewModel.sendMessage() },
                onStop: { viewModel.stopStreaming() },
                onAttachImage: { url in viewModel.attachImage(url) },
                onScreenshot: { viewModel.takeScreenshot() },
                onClear: { viewModel.clearInput() },
                isStreaming: viewModel.isStreaming
            )
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(effectiveBackground)
    }

    @ViewBuilder
    private var headerView: some View {
        HStack(spacing: 12) {
            providerMenu
            Spacer()
            modelSelector
            ThemeSelector(selectedTheme: $theme)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private var providerMenu: some View {
        Menu {
            ForEach(LLMProviderType.allCases, id: \.self) { provider in
                Button {
                    viewModel.selectProvider(provider)
                } label: {
                    HStack {
                        Text(provider.displayName)
                        if viewModel.selectedProvider == provider {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: viewModel.selectedProvider.icon)
                    .font(.system(size: 18))
                Text(viewModel.selectedProvider.displayName)
                    .font(.headline)
                Image(systemName: "chevron.down")
                    .font(.caption)
            }
            .foregroundStyle(.primary)
        }
        .menuStyle(.borderless)
    }

    @ViewBuilder
    private var modelSelector: some View {
        Menu {
            ForEach(viewModel.availableModels, id: \.self) { model in
                Button {
                    viewModel.selectModel(model)
                } label: {
                    HStack {
                        Text(model)
                        if viewModel.selectedModel == model {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Text(viewModel.selectedModel)
                    .font(.subheadline)
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 8))
        }
        .menuStyle(.borderless)
    }

    @ViewBuilder
    private var messagesScrollView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 0) {
                    if viewModel.conversations.isEmpty {
                        emptyStateView
                    } else {
                        ForEach(viewModel.currentConversation) { message in
                            ChatBubble(message: message)
                                .id(message.id)
                        }
                    }
                }
                .padding(.vertical, 16)
            }
            .scrollDismissesKeyboard(.interactively)
            .onAppear {
                scrollProxy = proxy
            }
            .onChange(of: viewModel.currentConversation.count) { _, _ in
                if !userScrolled {
                    scrollToBottom(proxy: proxy)
                }
            }
            .onChange(of: viewModel.isStreaming) { _, streaming in
                if streaming {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        scrollToBottom(proxy: proxy)
                    }
                }
            }
        }

        if showScrollToBottom {
            scrollToBottomButton
        }
    }

    @ViewBuilder
    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Spacer()
                .frame(height: 60)

            GlassmorphicIcon(icon: "cpu", theme: theme, size: 60)

            Text("How can I help you?")
                .font(.title2.weight(.semibold))

            Text("Press \(hotKeyLabel) or type your question")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            quickActionsView

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 40)
    }

    @ViewBuilder
    private var quickActionsView: some View {
        VStack(spacing: 12) {
            quickActionButton(icon: "camera.viewfinder", text: "Take screenshot") {
                viewModel.takeScreenshot()
            }
            quickActionButton(icon: "doc.text", text: "Analyze document") {
                viewModel.inputText = "/ocr "
            }
            quickActionButton(icon: "terminal", text: "Run command") {
                viewModel.inputText = "/shell "
            }
        }
        .padding(.top, 20)
    }

    @ViewBuilder
    private func quickActionButton(icon: String, text: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                Text(text)
            }
            .font(.subheadline)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(.ultraThinMaterial)
            )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var scrollToBottomButton: some View {
        Button {
            scrollToBottomLatest()
        } label: {
            GlassmorphicIcon(icon: "chevron.down", theme: theme, size: 32)
        }
        .buttonStyle(.plain)
        .padding(.bottom, 60)
    }

    private var effectiveBackground: some View {
        GlassBackground(theme: theme)
    }

    private var hotKeyLabel: String {
        #if os(macOS)
        return "⌃ Control"
        #else
        return "Control"
        #endif
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        guard let lastMessage = viewModel.currentConversation.last else { return }
        withAnimation(.easeOut(duration: 0.3)) {
            proxy.scrollTo(lastMessage.id, anchor: .bottom)
        }
    }

    private func scrollToBottomLatest() {
        guard let lastMessage = viewModel.currentConversation.last,
              let proxy = scrollProxy else { return }
        withAnimation(.easeOut(duration: 0.3)) {
            proxy.scrollTo(lastMessage.id, anchor: .bottom)
        }
    }
}

struct GlassmorphicIcon: View {
    let icon: String
    let theme: NexusTheme
    let size: CGFloat

    var body: some View {
        Image(systemName: icon)
            .font(.system(size: size * 0.5))
            .foregroundStyle(
                LinearGradient(
                    colors: [theme.primaryColor, theme.secondaryColor],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .frame(width: size, height: size)
            .background(
                Circle()
                    .fill(.ultraThinMaterial)
                    .overlay(
                        Circle()
                            .stroke(
                                LinearGradient(
                                    colors: [.white.opacity(0.3), .clear],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
            )
            .shadow(color: theme.primaryColor.opacity(0.3), radius: 10, x: 0, y: 5)
    }
}

struct GlassBackground: View {
    let theme: NexusTheme
    @State private var phase = 0.0

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate

                let gradient1 = Gradient(colors: [
                    theme.primaryColor.opacity(0.08),
                    theme.secondaryColor.opacity(0.05),
                    Color.clear
                ])

                let start1 = CGPoint(
                    x: size.width * (0.5 + 0.5 * sin(time * 0.3)),
                    y: 0
                )
                let end1 = CGPoint(
                    x: size.width * (0.5 + 0.3 * cos(time * 0.4)),
                    y: size.height
                )

                context.fill(
                    Path.linearGradient(
                        gradient1,
                        start: start1,
                        end: end1
                    ),
                    with: .linearGradient(
                        gradient1,
                        startPoint: start1,
                        endPoint: end1,
                        options: []
                    )
                )

                let gradient2 = Gradient(colors: [
                    theme.secondaryColor.opacity(0.04),
                    Color.clear
                ])

                let rect = CGRect(
                    x: size.width * 0.7,
                    y: size.height * 0.3,
                    width: size.width * 0.4,
                    height: size.height * 0.5
                )

                context.fill(
                    Path(ellipseIn: rect),
                    with: .radialGradient(
                        gradient2,
                        center: CGPoint(x: rect.midX, y: rect.midY),
                        startRadius: 0,
                        endRadius: rect.width
                    )
                )
            }
        }
        .background(Color.black.opacity(0.2))
    }
}

#Preview {
    ConversationView(
        viewModel: ChatViewModel(),
        theme: .constant(.liquidGlass)
    )
    .frame(width: 500, height: 600)
}
