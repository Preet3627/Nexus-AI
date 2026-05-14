import AppIntents
import AppKit
import SwiftUI

@main
struct NexusApp: App {
    @StateObject private var settings = AppSettings()

    init() {
        NexusShortcuts.updateAppShortcutParameters()
    }

    var body: some Scene {
        WindowGroup {
            NativeCommandCenterView(settings: settings)
                .frame(minWidth: 720, minHeight: 120)
                .preferredColorScheme(.dark)
        }
        .windowStyle(.hiddenTitleBar)
    }
}

private struct NativeCommandCenterView: View {
    @ObservedObject var settings: AppSettings
    @State private var availableWidth: CGFloat = 1120
    @State private var measuredContentSize: CGSize = CGSize(width: 960, height: 620)

    var body: some View {
        let metrics = LayoutMetrics(width: availableWidth, height: measuredContentSize.height)

        ZStack(alignment: .top) {
            Color.clear

            shell(metrics: metrics)
                .padding(metrics.outerPadding)
                .frame(maxWidth: .infinity, alignment: .top)
                .background(alignment: .top) {
                    ShellAura()
                        .padding(.top, 46)
                }
                .background {
                    ShellFrameBackdrop(cornerRadius: metrics.shellCornerRadius)
                        .padding(metrics.outerPadding - 8)
                }
                .fixedSize(horizontal: false, vertical: true)
                .readSize { size in
                    availableWidth = size.width
                    measuredContentSize = size
                }
        }
        .background(
            WindowConfigurator(
                targetContentSize: measuredContentSize,
                minimumWidth: 720,
                minimumHeight: 120
            )
        )
    }

    @ViewBuilder
    private func shell(metrics: LayoutMetrics) -> some View {
        VStack(spacing: metrics.sectionSpacing) {
            topBar(metrics: metrics)

            if metrics.stacksContent {
                VStack(spacing: metrics.sectionSpacing) {
                    heroPanel(metrics: metrics)
                    controlRail(metrics: metrics)
                }
            } else {
                HStack(alignment: .top, spacing: metrics.sectionSpacing) {
                    heroPanel(metrics: metrics)
                    controlRail(metrics: metrics)
                }
            }

            composerPanel(metrics: metrics)
        }
    }

    private func topBar(metrics: LayoutMetrics) -> some View {
        GlassPanel {
            VStack(alignment: .leading, spacing: metrics.topBarStackSpacing) {
                dragHandle
                if metrics.stacksTopBar {
                    headerCopy(metrics: metrics)
                    HStack(spacing: 12) {
                        providerMenu(metrics: metrics)
                        touchIDButton
                    }
                } else {
                    HStack(alignment: .center, spacing: 18) {
                        headerCopy(metrics: metrics)
                        Spacer()
                        providerMenu(metrics: metrics)
                        touchIDButton
                    }
                }
            }
            .padding(metrics.panelPadding)
        }
    }

    private var dragHandle: some View {
        ZStack {
            WindowDragRegion()

            Capsule()
                .fill(Color.white.opacity(0.16))
                .frame(width: 86, height: 7)
                .overlay(
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [
                                    Color.white.opacity(0.28),
                                    Color.white.opacity(0.06)
                                ],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                )
        }
        .frame(maxWidth: .infinity)
        .frame(height: 16)
    }

    private func headerCopy(metrics: LayoutMetrics) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Nexus AI")
                .font(.system(size: metrics.brandTitleSize, weight: .bold, design: .rounded))

            if metrics.stacksStatusPills {
                VStack(alignment: .leading, spacing: 8) {
                    statusPills
                }
            } else {
                HStack(spacing: 10) {
                    statusPills
                }
            }
        }
    }

    @ViewBuilder
    private var statusPills: some View {
        StatusPill(label: "SwiftUI Native", tint: Color(red: 0.42, green: 0.78, blue: 1.0))
        StatusPill(label: settings.statusHeadline, tint: Color(red: 0.58, green: 0.47, blue: 1.0))
    }

    private var touchIDButton: some View {
        Button {
            Task {
                await settings.verifyTouchID()
            }
        } label: {
            Label(settings.identityStatus, systemImage: "touchid")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .foregroundStyle(.white.opacity(0.92))
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(
                    Capsule()
                        .fill(Color.white.opacity(0.08))
                )
        }
        .buttonStyle(.plain)
    }

    private func providerMenu(metrics: LayoutMetrics) -> some View {
        Menu {
            ForEach(settings.availableProviders, id: \.self) { provider in
                Button {
                    settings.selectedProvider = provider
                } label: {
                    if provider == settings.selectedProvider {
                        Label(provider, systemImage: "checkmark")
                    } else {
                        Text(provider)
                    }
                }
            }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "server.rack")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color(red: 1.0, green: 0.68, blue: 0.40))

                VStack(alignment: .leading, spacing: 2) {
                    Text("Active Provider")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.56))
                    Text(settings.selectedProvider)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                }

                Image(systemName: "chevron.down")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.white.opacity(0.66))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: metrics.stacksTopBar ? .infinity : nil, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Color.white.opacity(0.08))
            )
        }
        .menuStyle(.borderlessButton)
    }

    private func heroPanel(metrics: LayoutMetrics) -> some View {
        GlassPanel {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Native macOS command center")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color(red: 0.61, green: 0.74, blue: 1.0))
                        .textCase(.uppercase)
                        .tracking(1.6)

                    Text("Bring back the polished SwiftUI surface, not the flat web shell.")
                        .font(.system(size: metrics.heroTitleSize, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.98))
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text("A dramatic glass command deck with native materials, richer hierarchy, and quick access to the commands people actually use.")
                        .font(.system(size: metrics.heroBodySize, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.72))
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                LazyVGrid(columns: metrics.presetColumns, spacing: 12) {
                    ForEach(settings.presets) { preset in
                        Button {
                            settings.stage(preset)
                        } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(preset.title)
                                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                                    .foregroundStyle(.white.opacity(0.58))
                                Text(preset.command)
                                    .font(.system(size: 15, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(.white.opacity(0.95))
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                RoundedRectangle(cornerRadius: 20, style: .continuous)
                                    .fill(Color.white.opacity(0.06))
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                if metrics.stacksSignalCards {
                    VStack(alignment: .leading, spacing: 16) {
                        signalCards
                    }
                } else {
                    HStack(alignment: .top, spacing: 16) {
                        signalCards
                    }
                }

                LazyVGrid(columns: metrics.commandHintColumns, alignment: .leading, spacing: 10) {
                    ForEach(settings.commandHints, id: \.self) { hint in
                        Text(hint)
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundStyle(.white.opacity(0.64))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(
                                Capsule()
                                    .fill(Color.white.opacity(0.06))
                            )
                    }
                }
            }
            .padding(metrics.panelPadding)
            .frame(maxWidth: .infinity, minHeight: metrics.heroMinHeight, alignment: .topLeading)
        }
    }

    @ViewBuilder
    private var signalCards: some View {
        CommandAtmosphereCard(
            title: "Live Signals",
            accent: Color(red: 0.50, green: 0.60, blue: 1.0),
            lines: [
                "Overlay summon: Control Control",
                "Identity: \(settings.identityStatus)",
                "Result: \(settings.lastCommandResult)"
            ]
        )

        CommandAtmosphereCard(
            title: "Provider Rail",
            accent: Color(red: 1.0, green: 0.66, blue: 0.38),
            lines: settings.availableProviders.map { provider in
                provider == settings.selectedProvider ? "\(provider) active" : provider
            }
        )
    }

    private func controlRail(metrics: LayoutMetrics) -> some View {
        VStack(spacing: metrics.railSpacing) {
            GlassPanel {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Quick Actions")
                        .font(.system(size: 20, weight: .bold, design: .rounded))

                    Text("Native actions remain one tap away, but now the shell looks deliberate.")
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.68))

                    VStack(spacing: 12) {
                        ForEach(settings.quickActions) { action in
                            Button {
                                settings.apply(action)
                            } label: {
                                HStack(spacing: 14) {
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .fill(action.tint.opacity(0.18))
                                        .frame(width: 48, height: 48)
                                        .overlay(
                                            Image(systemName: action.symbol)
                                                .font(.system(size: 18, weight: .bold))
                                                .foregroundStyle(action.tint)
                                        )

                                    VStack(alignment: .leading, spacing: 5) {
                                        Text(action.title)
                                            .font(.system(size: 15, weight: .bold, design: .rounded))
                                            .foregroundStyle(.white.opacity(0.96))
                                        Text(action.subtitle)
                                            .font(.system(size: 12, weight: .medium, design: .rounded))
                                            .foregroundStyle(.white.opacity(0.62))
                                            .multilineTextAlignment(.leading)
                                            .fixedSize(horizontal: false, vertical: true)
                                    }

                                    Spacer(minLength: 0)
                                }
                                .padding(16)
                                .background(
                                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                                        .fill(Color.white.opacity(0.05))
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(metrics.panelPadding)
            }

            GlassPanel {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Command Preview")
                        .font(.system(size: 17, weight: .bold, design: .rounded))

                    Text(settings.query.isEmpty ? "Queue a command from the preset rail or quick actions." : settings.query)
                        .font(.system(size: settings.query.isEmpty ? 14 : 16, weight: .medium, design: settings.query.isEmpty ? .rounded : .monospaced))
                        .foregroundStyle(.white.opacity(settings.query.isEmpty ? 0.56 : 0.92))
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(16)
                        .background(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .fill(Color.black.opacity(0.22))
                        )

                    Text(settings.lastCommandResult)
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.66))
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(metrics.panelPadding)
            }
        }
        .frame(
            maxWidth: metrics.stacksContent ? .infinity : metrics.controlRailWidth,
            alignment: .topLeading
        )
    }

    private func composerPanel(metrics: LayoutMetrics) -> some View {
        GlassPanel {
            VStack(spacing: 18) {
                HStack(alignment: .bottom, spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color.white.opacity(0.07))
                            .frame(width: 48, height: 48)
                        Image(systemName: "sparkles")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundStyle(Color(red: 0.56, green: 0.67, blue: 1.0))
                    }

                    TextField("Stage a native command or AI request...", text: $settings.query, axis: .vertical)
                        .textFieldStyle(.plain)
                        .font(.system(size: metrics.composerFontSize, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.96))
                        .lineLimit(1 ... 5)

                    Button {
                        settings.runCurrentQuery()
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 48, height: 48)
                            .background(
                                Circle()
                                    .fill(
                                        LinearGradient(
                                            colors: [
                                                Color(red: 0.56, green: 0.47, blue: 1.0),
                                                Color(red: 0.38, green: 0.65, blue: 1.0)
                                            ],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                }

                if metrics.stacksComposerFooter {
                    VStack(alignment: .leading, spacing: 12) {
                        providerPills
                        statusLabel
                    }
                } else {
                    HStack(spacing: 10) {
                        providerPills
                        Spacer()
                        statusLabel
                    }
                }
            }
            .padding(metrics.composerPadding)
        }
    }

    @ViewBuilder
    private var providerPills: some View {
        HStack(spacing: 10) {
            ForEach(settings.availableProviders, id: \.self) { provider in
                Button {
                    settings.selectedProvider = provider
                } label: {
                    Text(provider)
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(provider == settings.selectedProvider ? Color.black.opacity(0.78) : .white.opacity(0.72))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .fill(provider == settings.selectedProvider ? Color.white.opacity(0.92) : Color.white.opacity(0.06))
                        )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var statusLabel: some View {
        Text(settings.statusHeadline)
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .foregroundStyle(.white.opacity(0.62))
            .lineLimit(1)
    }
}

private struct LayoutMetrics {
    let width: CGFloat
    let height: CGFloat

    var stacksContent: Bool { width < 1180 }
    var stacksTopBar: Bool { width < 980 }
    var stacksStatusPills: Bool { width < 880 }
    var stacksSignalCards: Bool { width < 980 }
    var stacksComposerFooter: Bool { width < 930 }

    var outerPadding: CGFloat { width < 900 ? 18 : 28 }
    var sectionSpacing: CGFloat { width < 900 ? 18 : 24 }
    var panelPadding: CGFloat { width < 900 ? 20 : 24 }
    var composerPadding: CGFloat { width < 900 ? 18 : 22 }
    var railSpacing: CGFloat { width < 900 ? 14 : 18 }
    var topBarStackSpacing: CGFloat { stacksTopBar ? 14 : 0 }

    var brandTitleSize: CGFloat { width < 900 ? 28 : 34 }
    var heroTitleSize: CGFloat {
        if width < 840 { return 30 }
        if width < 980 { return 36 }
        if width < 1320 { return 40 }
        return 46
    }
    var heroBodySize: CGFloat { width < 900 ? 16 : 18 }
    var composerFontSize: CGFloat { width < 900 ? 18 : 22 }
    var heroMinHeight: CGFloat { width < 900 ? 300 : 390 }
    var controlRailWidth: CGFloat { width < 1320 ? 320 : 360 }
    var shellCornerRadius: CGFloat { width < 900 ? 34 : 40 }

    var presetColumns: [GridItem] {
        [GridItem(.adaptive(minimum: width < 900 ? 170 : 200), spacing: 12)]
    }

    var commandHintColumns: [GridItem] {
        [GridItem(.adaptive(minimum: width < 900 ? 150 : 180), spacing: 10)]
    }
}

private struct ShellFrameBackdrop: View {
    let cornerRadius: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [
                        Color(red: 0.09, green: 0.10, blue: 0.15).opacity(0.98),
                        Color(red: 0.10, green: 0.12, blue: 0.20).opacity(0.94),
                        Color(red: 0.12, green: 0.14, blue: 0.24).opacity(0.92)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.22),
                                Color.white.opacity(0.05),
                                Color.clear
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.42), radius: 42, y: 24)
    }
}

private struct ShellAura: View {
    var body: some View {
        ZStack {
            Ellipse()
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.32, green: 0.38, blue: 1.0).opacity(0.22),
                            Color(red: 0.56, green: 0.38, blue: 0.98).opacity(0.16),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(width: 980, height: 420)
                .blur(radius: 54)

            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [
                            Color.white.opacity(0.10),
                            .clear
                        ],
                        center: .center,
                        startRadius: 24,
                        endRadius: 220
                    )
                )
                .frame(width: 580, height: 240)
                .blur(radius: 20)
                .offset(y: 24)
        }
        .allowsHitTesting(false)
    }
}

private struct GlassPanel<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 30, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.10),
                                Color.white.opacity(0.04),
                                Color.black.opacity(0.18)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .background(
                        RoundedRectangle(cornerRadius: 30, style: .continuous)
                            .fill(Color.black.opacity(0.22))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 30, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [
                                        Color.white.opacity(0.24),
                                        Color.white.opacity(0.08),
                                        Color.clear
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
            )
            .shadow(color: Color.black.opacity(0.28), radius: 30, y: 18)
    }
}

private struct StatusPill: View {
    let label: String
    let tint: Color

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(tint)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.system(size: 12, weight: .bold, design: .rounded))
        }
        .foregroundStyle(.white.opacity(0.86))
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(Color.white.opacity(0.08))
        )
    }
}

private struct CommandAtmosphereCard: View {
    let title: String
    let accent: Color
    let lines: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                Circle()
                    .fill(accent.opacity(0.20))
                    .frame(width: 34, height: 34)
                    .overlay(
                        Circle()
                            .fill(accent)
                            .frame(width: 10, height: 10)
                    )

                Text(title)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
            }

            VStack(alignment: .leading, spacing: 8) {
                ForEach(lines, id: \.self) { line in
                    Text(line)
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(.white.opacity(0.72))
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .frame(maxWidth: .infinity, minHeight: 150, alignment: .topLeading)
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(Color.white.opacity(0.05))
        )
    }
}

private struct WindowConfigurator: NSViewRepresentable {
    let targetContentSize: CGSize
    let minimumWidth: CGFloat
    let minimumHeight: CGFloat

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> NSView {
        let view = NSView(frame: .zero)
        DispatchQueue.main.async {
            context.coordinator.configureWindow(
                for: view.window,
                targetContentSize: targetContentSize,
                minimumWidth: minimumWidth,
                minimumHeight: minimumHeight
            )
        }
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        DispatchQueue.main.async {
            context.coordinator.configureWindow(
                for: nsView.window,
                targetContentSize: targetContentSize,
                minimumWidth: minimumWidth,
                minimumHeight: minimumHeight
            )
        }
    }

    final class Coordinator {
        private var lastAppliedHeight: CGFloat = 0

        func configureWindow(
            for window: NSWindow?,
            targetContentSize: CGSize,
            minimumWidth: CGFloat,
            minimumHeight: CGFloat
        ) {
            guard let window else { return }

            window.isOpaque = false
            window.backgroundColor = .clear
            window.titlebarAppearsTransparent = true
            window.titleVisibility = .hidden
            window.isMovableByWindowBackground = true
            window.hasShadow = true
            window.minSize = NSSize(width: minimumWidth, height: minimumHeight)
            window.styleMask.insert(.fullSizeContentView)

            guard targetContentSize.height > 0 else { return }

            let chromeHeight = window.frame.height - window.contentLayoutRect.height
            let visibleScreenHeight = (window.screen ?? NSScreen.main)?.visibleFrame.height ?? 900
            let targetHeight = min(
                max(targetContentSize.height + chromeHeight, minimumHeight),
                visibleScreenHeight - 32
            )

            guard abs(targetHeight - lastAppliedHeight) > 1 else { return }
            lastAppliedHeight = targetHeight

            var frame = window.frame
            frame.origin.y = frame.maxY - targetHeight
            frame.size.height = targetHeight
            window.setFrame(frame, display: true, animate: false)
        }
    }
}

private struct SizePreferenceKey: PreferenceKey {
    static var defaultValue: CGSize = .zero

    static func reduce(value: inout CGSize, nextValue: () -> CGSize) {
        value = nextValue()
    }
}

private extension View {
    func readSize(onChange: @escaping (CGSize) -> Void) -> some View {
        background(
            GeometryReader { proxy in
                Color.clear
                    .preference(key: SizePreferenceKey.self, value: proxy.size)
            }
        )
        .onPreferenceChange(SizePreferenceKey.self, perform: onChange)
    }
}

private struct WindowDragRegion: NSViewRepresentable {
    func makeNSView(context: Context) -> DragRegionView {
        DragRegionView(frame: .zero)
    }

    func updateNSView(_ nsView: DragRegionView, context: Context) {}

    final class DragRegionView: NSView {
        override var mouseDownCanMoveWindow: Bool { true }

        override func hitTest(_ point: NSPoint) -> NSView? {
            self
        }
    }
}
