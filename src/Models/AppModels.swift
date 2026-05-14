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

struct SharedGoogleAuthSession: Codable {
    var uid: String?
    var email: String?
    var name: String?
    var photo: String?
    var access_token: String?
    var refresh_token: String?
    var id_token: String?
    var expires_at: Int64?
    var scopes: [String]
    var firebase_config: String?
    var source: String?
}

struct AuthBridgeFirebaseConfig: Codable {
    var apiKey: String?
    var authDomain: String?
    var projectId: String?
    var storageBucket: String?
    var messagingSenderId: String?
    var appId: String?
    var measurementId: String?
}

struct AuthBridgeConfigResponse: Codable {
    var googleClientId: String?
    var firebaseConfig: AuthBridgeFirebaseConfig?
}

enum SharedGoogleAuthNamespace {
    case identity
    case workspace

    var serviceName: String {
        switch self {
        case .identity:
            return "in.ponsri.shared.google.identity"
        case .workspace:
            return "in.ponsri.shared.google.workspace"
        }
    }
}

enum NativeAuthScopeMode {
    case identity
    case workspace

    var namespace: SharedGoogleAuthNamespace {
        switch self {
        case .identity:
            return .identity
        case .workspace:
            return .workspace
        }
    }

    var requestedScopes: [String] {
        switch self {
        case .identity:
            return ["openid", "email", "profile"]
        case .workspace:
            return [
                "openid",
                "email",
                "profile",
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.send",
                "https://www.googleapis.com/auth/drive.file",
                "https://www.googleapis.com/auth/drive.metadata.readonly",
            ]
        }
    }
}
