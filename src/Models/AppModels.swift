import Foundation
import SwiftUI

struct QuickAction: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let subtitle: String
    let command: String
    let symbol: String
    let tint: Color
}

struct CommandPreset: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let command: String
}
