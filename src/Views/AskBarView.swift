import SwiftUI
import UniformTypeIdentifiers

struct AskBarView: View {
    @Binding var inputText: String
    let onSubmit: () -> Void
    let onStop: () -> Void
    let onAttachImage: (URL) -> Void
    let onScreenshot: () -> Void
    let onClear: () -> Void
    let isStreaming: Bool
    @State private var isFocused = false
    @State private var showAttachments = false
    @State private var showSlashMenu = false
    @State private var slashFilter = ""
    @State private var slashSelectedIndex = 0
    @FocusState private var textFieldFocused: Bool

    private let slashCommands = [
        ("/screenshot", "Take screenshot and analyze", "camera.viewfinder"),
        ("/screen", "Capture screen region", "crop"),
        ("/think", "Enable thinking mode", "brain"),
        ("/search", "Search the web", "magnifyingglass"),
        ("/code", "Generate code", "chevron.left.forwardslash.chevron.right"),
        ("/pdf", "Create PDF document", "doc.richtext"),
        ("/shell", "Execute shell command", "terminal"),
        ("/click", "Click on screen element", "cursorarrow.click"),
        ("/navigate", "Open URL in browser", "safari"),
        ("/ocr", "Extract text from screen", "text.viewfinder")
    ]

    private var filteredCommands: [(String, String, String)] {
        if slashFilter.isEmpty { return slashCommands }
        return slashCommands.filter { $0.0.localizedCaseInsensitiveContains(slashFilter) }
    }

    var body: some View {
        VStack(spacing: 8) {
            if showAttachments {
                attachmentPreview
            }

            HStack(spacing: 12) {
                leftToolbar
                inputField
                rightToolbar
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(
                        isFocused ? Color.purple.opacity(0.5) : Color.clear,
                        lineWidth: 2
                    )
            )

            if showSlashMenu {
                slashMenu
            }
        }
        .onChange(of: inputText) { _, newValue in
            handleInputChange(newValue)
        }
    }

    @ViewBuilder
    private var leftToolbar: some View {
        HStack(spacing: 8) {
            Menu {
                Button(action: { performPaste() }) {
                    Label("Paste", systemImage: "doc.on.clipboard")
                }
                Button(action: { showAttachments.toggle() }) {
                    Label("Attachments", systemImage: "paperclip")
                }
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(.secondary)
            }
            .menuStyle(.borderless)
            .fixedSize()

            if !inputText.isEmpty && !isStreaming {
                Button(action: onClear) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .fixedSize()
            }
        }
    }

    @ViewBuilder
    private var inputField: some View {
        TextField("Ask anything...", text: $inputText, axis: .vertical)
            .textFieldStyle(.plain)
            .font(.body)
            .lineLimit(1...8)
            .focused($textFieldFocused)
            .onChange(of: textFieldFocused) { _, focused in
                isFocused = focused
            }
            .onSubmit {
                if !inputText.isEmpty && !isStreaming {
                    onSubmit()
                }
            }
    }

    @ViewBuilder
    private var rightToolbar: some View {
        HStack(spacing: 8) {
            if isStreaming {
                stopButton
            } else {
                submitButtons
            }
        }
    }

    @ViewBuilder
    private var stopButton: some View {
        Button(action: onStop) {
            Image(systemName: "stop.fill")
                .font(.system(size: 16))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(Color.red.gradient)
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var submitButtons: some View {
        if !inputText.isEmpty {
            sendButton
        }

        Button(action: onScreenshot) {
            Image(systemName: "camera.viewfinder")
                .font(.system(size: 18))
                .foregroundStyle(.purple)
        }
        .buttonStyle(.plain)
        .help("Take screenshot")

        if canSubmit {
            sendButton
        }
    }

    @ViewBuilder
    private var sendButton: some View {
        Button(action: onSubmit) {
            Image(systemName: "arrow.up.circle.fill")
                .font(.system(size: 28))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.purple, .blue],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
        .buttonStyle(.plain)
        .disabled(inputText.isEmpty)
    }

    @ViewBuilder
    private var attachmentPreview: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(0..<2, id: \.self) { index in
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.quaternary)
                        .frame(width: 60, height: 60)
                        .overlay(
                            Image(systemName: "photo")
                                .foregroundStyle(.secondary)
                        )
                }
            }
            .padding(.horizontal, 12)
        }
    }

    @ViewBuilder
    private var slashMenu: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(Array(filteredCommands.enumerated()), id: \.offset) { index, command in
                HStack(spacing: 12) {
                    Image(systemName: command.2)
                        .font(.system(size: 16))
                        .foregroundStyle(.purple)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(command.0)
                            .font(.subheadline.weight(.medium))
                        Text(command.1)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if index == slashSelectedIndex {
                        Image(systemName: "arrow.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(index == slashSelectedIndex ? Color.purple.opacity(0.15) : Color.clear)
                .contentShape(Rectangle())
                .onTapGesture {
                    selectCommand(command.0)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: 300)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.1), radius: 10)
        .padding(.horizontal, 16)
    }

    private var canSubmit: Bool {
        !inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func handleInputChange(_ value: String) {
        if value.hasPrefix("/") {
            slashFilter = String(value.dropFirst())
            showSlashMenu = true
            slashSelectedIndex = 0
        } else {
            showSlashMenu = false
        }
    }

    private func selectCommand(_ command: String) {
        inputText = command + " "
        showSlashMenu = false
        textFieldFocused = true
    }

    private func performPaste() {
        if let string = NSPasteboard.general.string(forType: .string) {
            inputText = string
        }
    }
}

#Preview {
    AskBarView(
        inputText: .constant(""),
        onSubmit: {},
        onStop: {},
        onAttachImage: { _ in },
        onScreenshot: {},
        onClear: {},
        isStreaming: false
    )
    .padding()
    .frame(width: 500)
}
