import SwiftUI

struct ChatBubble: View {
    let message: Message
    @State private var isHovering = false
    @State private var bubbleOffset: CGFloat = -20
    @State private var bubbleOpacity: Double = 0
    @State private var showContent: Bool = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if message.role == .user {
                Spacer(minLength: 60)
            }

            avatarView
                .opacity(isHovering ? 1 : 0.6)

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 8) {
                bubbleContent
                timestampView
            }

            if message.role == .assistant {
                Spacer(minLength: 60)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .opacity(bubbleOpacity)
        .offset(y: bubbleOffset)
        .onAppear {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.7).delay(0.05)) {
                bubbleOffset = 0
                bubbleOpacity = 1
            }
            if message.isStreaming {
                showContent = true
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    showContent = true
                }
            }
        }
        .onHover { hovering in
            withAnimation(.easeInOut(duration: 0.2)) {
                isHovering = hovering
            }
        }
    }

    @ViewBuilder
    private var avatarView: some View {
        Group {
            if message.role == .user {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.blue.gradient)
            } else if message.isStreaming {
                PulsingDots()
            } else {
                Image(systemName: "cpu")
                    .font(.system(size: 24))
                    .foregroundStyle(.purple.gradient)
            }
        }
    }

    @ViewBuilder
    private var bubbleContent: some View {
        if showContent {
            if message.isStreaming {
                StreamingBubble(message: message)
            } else {
                StaticBubble(message: message)
            }
        } else {
            placeholderBubble
        }
    }

    @ViewBuilder
    private var placeholderBubble: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(Color.gray.opacity(0.2))
            .frame(width: 100, height: 40)
    }

    @ViewBuilder
    private var timestampView: some View {
        if isHovering {
            Text(message.timestamp, style: .time)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .transition(.opacity.combined(with: .scale))
        }
    }
}

struct StreamingBubble: View {
    let message: Message
    @State private var displayedText: String = ""
    @State private var glowPhase: Double = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WaveText(text: displayedText, role: .assistant)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color.purple.opacity(0.08))
                        .shadow(color: .purple.opacity(0.15), radius: 8, x: 0, y: 4)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(
                            LinearGradient(
                                colors: [.purple.opacity(0.3), .purple.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                )
        }
        .onAppear {
            animateText()
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                glowPhase = 1
            }
        }
        .onChange(of: message.content) { _, newValue in
            animateTextIncremental(from: displayedText, to: newValue)
        }
    }

    private func animateText() {
        displayedText = message.content
    }

    private func animateTextIncremental(from: String, to: String) {
        displayedText = to
    }
}

struct StaticBubble: View {
    let message: Message
    @State private var shimmerOffset: CGFloat = -2
    @State private var isVisible = false

    var body: some View {
        ZStack {
            Text(attributedText)
                .font(.body)
                .foregroundStyle(.primary)
                .textSelection(.enabled)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(bubbleGradient)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            shimmerOverlay
        }
        .opacity(isVisible ? 1 : 0)
        .scaleEffect(isVisible ? 1 : 0.95)
        .onAppear {
            withAnimation(.spring(response: 0.4, dampingFraction: 0.8).delay(0.1)) {
                isVisible = true
            }
        }
    }

    private var bubbleGradient: some ShapeStyle {
        if message.role == .user {
            return AnyShapeStyle(LinearGradient(
                colors: [.blue.opacity(0.15), .blue.opacity(0.08)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ))
        } else {
            return AnyShapeStyle(LinearGradient(
                colors: [.purple.opacity(0.12), .purple.opacity(0.06)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ))
        }
    }

    @ViewBuilder
    private var shimmerOverlay: some View {
        GeometryReader { geometry in
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [
                            .clear,
                            .white.opacity(0.15),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(width: geometry.size.width * 0.5)
                .offset(x: shimmerOffset * geometry.size.width)
                .mask(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white)
                )
        }
        .onAppear {
            withAnimation(.linear(duration: 2).repeatForever(autoreverses: false)) {
                shimmerOffset = 2
            }
        }
    }

    private var attributedText: AttributedString {
        var result = AttributedString(message.content)

        if let reasoning = message.reasoning, !reasoning.isEmpty {
            var reasoningText = AttributedString("\n💭 \(reasoning)\n")
            reasoningText.foregroundColor = .secondary
            reasoningText.font = .caption
            result.append(reasoningText)
        }

        if let ocr = message.ocrText, !ocr.isEmpty {
            var ocrText = AttributedString("\n📷 OCR: \(ocr)\n")
            ocrText.foregroundColor = .orange
            ocrText.font = .caption
            result.append(ocrText)
        }

        return result
    }
}

struct WaveText: View {
    let text: String
    let role: MessageRole
    @State private var phase: Double = 0

    var body: some View {
        Text(text)
            .font(.body)
            .foregroundStyle(role == .user ? Color.white : Color.primary)
            .textSelection(.enabled)
            .overlay(
                GeometryReader { geometry in
                    canvasView(size: geometry.size)
                }
            )
            .onAppear {
                withAnimation(.linear(duration: 3).repeatForever(autoreverses: false)) {
                    phase = .pi * 2
                }
            }
    }

    @ViewBuilder
    private func canvasView(size: CGSize) -> some View {
        Canvas { context, size in
            guard !text.isEmpty else { return }

            let font = UIFont.systemFont(ofSize: 17)
            let attributedString = NSAttributedString(
                string: text,
                attributes: [.font: font]
            )

            let textRange = CFRangeMake(0, text.count)
            let typographyStyle = CTFramesetterSuggestFrameSizeWithConstraints(
                CTFramesetterCreateWithAttributedString(attributedString),
                CFRangeMake(0, text.count),
                nil,
                CGSize(width: size.width, height: .greatestFiniteMagnitude),
                nil
            )

            let charactersPerLine = Int(size.width / (font.pointSize * 0.6))
            let lineHeight = font.lineHeight

            for (index, _) in text.enumerated() {
                let lineIndex = index / max(charactersPerLine, 1)
                let charOffset = index % max(charactersPerLine, 1)

                let baseX = CGFloat(charOffset) * (font.pointSize * 0.6)
                let baseY = CGFloat(lineIndex) * lineHeight

                let waveOffset = sin(Double(index) * 0.3 + phase) * 2
                let opacity = 0.7 + 0.3 * cos(Double(index) * 0.5 + phase)

                let charRect = CGRect(
                    x: baseX,
                    y: baseY + waveOffset,
                    width: font.pointSize,
                    height: lineHeight
                )

                context.opacity = opacity
            }
        }
        .allowsHitTesting(false)
    }
}

struct PulsingDots: View {
    @State private var animating = false
    @State private var dot1Scale: CGFloat = 0.5
    @State private var dot2Scale: CGFloat = 0.5
    @State private var dot3Scale: CGFloat = 0.5

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.purple, .blue],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 8, height: 8)
                    .scaleEffect(dotScale(for: index))
            }
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
        )
        .onAppear {
            startAnimation()
        }
    }

    private func dotScale(for index: Int) -> CGFloat {
        switch index {
        case 0: return dot1Scale
        case 1: return dot2Scale
        case 2: return dot3Scale
        default: return 0.5
        }
    }

    private func startAnimation() {
        withAnimation(
            .easeInOut(duration: 0.4)
            .repeatForever(autoreverses: true)
            .delay(0)
        ) {
            dot1Scale = 1.2
        }

        withAnimation(
            .easeInOut(duration: 0.4)
            .repeatForever(autoreverses: true)
            .delay(0.15)
        ) {
            dot2Scale = 1.2
        }

        withAnimation(
            .easeInOut(duration: 0.4)
            .repeatForever(autoreverses: true)
            .delay(0.3)
        ) {
            dot3Scale = 1.2
        }
    }
}

struct TypewriterText: View {
    let text: String
    let interval: TimeInterval
    let onComplete: ((String) -> Void)?

    @State private var displayedText: String = ""
    @State private var currentIndex: Int = 0
    @State private var cursorOpacity: Double = 1

    init(_ text: String, interval: TimeInterval = 0.03, onComplete: ((String) -> Void)? = nil) {
        self.text = text
        self.interval = interval
        self.onComplete = onComplete
    }

    var body: some View {
        HStack(spacing: 0) {
            Text(displayedText)
                .font(.body)
                .foregroundStyle(.primary)

            CursorBlink(opacity: cursorOpacity)
        }
        .onAppear {
            startTyping()
        }
    }

    private func startTyping() {
        Task { @MainActor in
            for index in text.indices {
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
                displayedText = String(text[...index])
            }

            onComplete?(displayedText)

            withAnimation(.easeInOut(duration: 0.3).delay(0.5)) {
                cursorOpacity = 0
            }
        }
    }
}

struct CursorBlink: View {
    let opacity: Double

    var body: some View {
        RoundedRectangle(cornerRadius: 1)
            .fill(Color.purple)
            .frame(width: 2, height: 18)
            .opacity(opacity)
            .shadow(color: .purple.opacity(0.5), radius: 4)
    }
}

struct ShimmerEffect: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    LinearGradient(
                        colors: [
                            .clear,
                            .white.opacity(0.3),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geometry.size.width * 0.5)
                    .offset(x: phase * geometry.size.width * 1.5)
                }
                .mask(content)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmer() -> some View {
        modifier(ShimmerEffect())
    }
}

#Preview {
    VStack(spacing: 0) {
        ChatBubble(message: Message(
            id: "1",
            role: .user,
            content: "What are the latest macOS features?"
        ))

        ChatBubble(message: Message(
            id: "2",
            role: .assistant,
            content: "macOS Sequoia introduces several exciting features including enhanced window management, improved performance, and new AI capabilities.",
            isStreaming: false
        ))

        ChatBubble(message: Message(
            id: "3",
            role: .assistant,
            content: "Let me think about this...",
            isStreaming: true
        ))
    }
    .frame(width: 450, height: 600)
    .background(Color(nsColor: .windowBackgroundColor))
}
