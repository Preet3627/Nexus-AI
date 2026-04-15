import SwiftUI

enum NexusTheme: String, CaseIterable, Identifiable {
    case liquidGlass = "Liquid Glass"
    case obsidian = "Obsidian"
    case aurora = "Aurora"
    case nebula = "Nebula"
    case crystal = "Crystal"
    case rose = "Rose"
    case azure = "Azure"
    case graphite = "Graphite"

    var id: String { rawValue }

    var primaryColor: Color {
        switch self {
        case .liquidGlass: return Color(hex: "6366f1")
        case .obsidian: return Color(hex: "a855f7")
        case .aurora: return Color(hex: "10b981")
        case .nebula: return Color(hex: "8b5cf6")
        case .crystal: return Color(hex: "06b6d4")
        case .rose: return Color(hex: "ec4899")
        case .azure: return Color(hex: "3b82f6")
        case .graphite: return Color(hex: "64748b")
        }
    }

    var secondaryColor: Color {
        switch self {
        case .liquidGlass: return Color(hex: "818cf8")
        case .obsidian: return Color(hex: "c084fc")
        case .aurora: return Color(hex: "34d399")
        case .nebula: return Color(hex: "a78bfa")
        case .crystal: return Color(hex: "22d3ee")
        case .rose: return Color(hex: "f472b6")
        case .azure: return Color(hex: "60a5fa")
        case .graphite: return Color(hex: "94a3b8")
        }
    }

    var backgroundOpacity: Double {
        switch self {
        case .liquidGlass: return 0.65
        case .obsidian: return 0.85
        case .aurora: return 0.70
        case .nebula: return 0.75
        case .crystal: return 0.55
        case .rose: return 0.68
        case .azure: return 0.72
        case .graphite: return 0.80
        }
    }

    var blurStyle: UIBlurEffect.Style {
        switch self {
        case .liquidGlass, .crystal: return .huge
        case .obsidian, .graphite: return .dark
        case .aurora, .nebula: return .regular
        case .rose, .azure: return .material
        }
    }

    var icon: String {
        switch self {
        case .liquidGlass: return "drop.fill"
        case .obsidian: return "moon.fill"
        case .aurora: return "sparkles"
        case .nebula: return "cloud.fill"
        case .crystal: return "snowflake"
        case .rose: return "heart.fill"
        case .azure: return "water.waves"
        case .graphite: return "cube.fill"
        }
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

struct GlassContainer<Content: View>: View {
    let theme: NexusTheme
    @ViewBuilder let content: Content

    var body: some View {
        content
            .background(
                GlassBackgroundView(theme: theme)
            )
    }
}

struct GlassBackgroundView: View {
    let theme: NexusTheme
    @State private var animationPhase: CGFloat = 0

    var body: some View {
        TimelineView(.animation) { timeline in
            Canvas { context, size in
                let time = timeline.date.timeIntervalSinceReferenceDate

                context.fill(
                    Path(roundedRect: CGRect(origin: .zero, size: size), cornerRadius: 20),
                    with: .color(.clear)
                )

                let gradient = Gradient(colors: [
                    theme.primaryColor.opacity(theme.backgroundOpacity * 0.3),
                    theme.secondaryColor.opacity(theme.backgroundOpacity * 0.2),
                    Color.clear
                ])

                let centerX = size.width * (0.3 + 0.4 * sin(time * 0.2))
                let centerY = size.height * (0.3 + 0.4 * cos(time * 0.3))

                context.fill(
                    Path(ellipseIn: CGRect(
                        x: centerX - size.width * 0.3,
                        y: centerY - size.height * 0.3,
                        width: size.width * 0.6,
                        height: size.height * 0.6
                    )),
                    with: .radialGradient(
                        gradient,
                        center: CGPoint(x: centerX, y: centerY),
                        startRadius: 0,
                        endRadius: size.width * 0.5
                    )
                )

                let secondGradient = Gradient(colors: [
                    theme.secondaryColor.opacity(theme.backgroundOpacity * 0.15),
                    Color.clear
                ])

                let secondX = size.width * (0.7 + 0.2 * cos(time * 0.15))
                let secondY = size.height * (0.6 + 0.3 * sin(time * 0.25))

                context.fill(
                    Path(ellipseIn: CGRect(
                        x: secondX - size.width * 0.25,
                        y: secondY - size.height * 0.25,
                        width: size.width * 0.5,
                        height: size.height * 0.5
                    )),
                    with: .radialGradient(
                        secondGradient,
                        center: CGPoint(x: secondX, y: secondY),
                        startRadius: 0,
                        endRadius: size.width * 0.4
                    )
                )
            }
        }
        .background(.ultraThinMaterial)
        .background(Color.black.opacity(theme.backgroundOpacity * 0.3))
    }
}

struct TranslucentPanel<Content: View>: View {
    let theme: NexusTheme
    @ViewBuilder let content: Content

    var body: some View {
        content
            .background(
                ZStack {
                    VisualEffectBlur(style: theme.blurStyle)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    GlassBackgroundView(theme: theme)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(.linearGradient(
                            colors: [
                                .white.opacity(0.15),
                                .white.opacity(0.05),
                                .clear
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ))

                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .stroke(
                            .linearGradient(
                                colors: [
                                    .white.opacity(0.3),
                                    .white.opacity(0.1),
                                    .clear
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 1
                        )
                }
            )
            .shadow(color: theme.primaryColor.opacity(0.2), radius: 20, x: 0, y: 10)
    }
}

struct VisualEffectBlur: UIViewRepresentable {
    let style: UIBlurEffect.Style

    func makeUIView(context: Context) -> UIVisualEffectView {
        UIVisualEffectView(effect: UIBlurEffect(style: style))
    }

    func updateUIView(_ uiView: UIVisualEffectView, context: Context) {
        uiView.effect = UIBlurEffect(style: style)
    }
}

struct ThemeSelector: View {
    @Binding var selectedTheme: NexusTheme
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 8) {
            if isExpanded {
                expandedView
            }

            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: selectedTheme.icon)
                        .font(.system(size: 14))
                        .foregroundStyle(selectedTheme.primaryColor.gradient)

                    Text(selectedTheme.rawValue)
                        .font(.subheadline.weight(.medium))

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(.ultraThinMaterial)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(selectedTheme.primaryColor.opacity(0.3), lineWidth: 1)
                        )
                )
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private var expandedView: some View {
        VStack(spacing: 4) {
            ForEach(NexusTheme.allCases) { theme in
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedTheme = theme
                        isExpanded = false
                    }
                } label: {
                    HStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(theme.primaryColor.gradient)
                                .frame(width: 24, height: 24)

                            Image(systemName: theme.icon)
                                .font(.system(size: 12))
                                .foregroundStyle(.white)
                        }

                        Text(theme.rawValue)
                            .font(.subheadline)

                        Spacer()

                        if selectedTheme == theme {
                            Image(systemName: "checkmark")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(theme.primaryColor)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(selectedTheme == theme ? theme.primaryColor.opacity(0.15) : Color.clear)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(.white.opacity(0.1), lineWidth: 1)
                )
        )
    }
}

#Preview {
    VStack(spacing: 20) {
        ThemeSelector(selectedTheme: .constant(.liquidGlass))

        TranslucentPanel(theme: .liquidGlass) {
            Text("Liquid Glass Panel")
                .padding()
        }
        .frame(width: 300, height: 150)

        TranslucentPanel(theme: .aurora) {
            Text("Aurora Panel")
                .padding()
        }
        .frame(width: 300, height: 150)
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(
        LinearGradient(
            colors: [.black, .purple.opacity(0.3), .blue.opacity(0.3)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    )
}
