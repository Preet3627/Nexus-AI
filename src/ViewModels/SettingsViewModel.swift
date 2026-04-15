import Foundation
import SwiftUI

@MainActor
public final class SettingsViewModel: ObservableObject {
    @Published public var settings: AppSettings
    @Published public var providers: [LLMProvider] = []
    @Published public var activeProviderId: String?
    @Published public var biometricAvailable: Bool = false
    @Published public var biometricName: String = "Biometrics"

    private let keychain: KeychainService
    private let biometricAuth: BiometricAuthService

    public init(
        keychain: KeychainService = KeychainService(),
        biometricAuth: BiometricAuthService = BiometricAuthService()
    ) {
        self.keychain = keychain
        self.biometricAuth = biometricAuth
        self.settings = .default
        loadSettings()
        checkBiometrics()
    }

    private func loadSettings() {
        if let data = try? keychain.getData(forKey: "app_settings"),
           let decoded = try? JSONDecoder().decode(AppSettings.self, from: data) {
            settings = decoded
        }
    }

    public func saveSettings() {
        if let encoded = try? JSONEncoder().encode(settings),
           let string = String(data: encoded, encoding: .utf8) {
            try? keychain.set(string, forKey: "app_settings")
        }
    }

    private func checkBiometrics() {
        biometricAvailable = biometricAuth.isAvailable
        biometricName = biometricAuth.biometryName
    }

    public func setActiveProvider(_ id: String) {
        activeProviderId = id
        settings.llm.activeProvider = id
        saveSettings()
    }

    public func updateProviderAPIKey(_ id: String, apiKey: String) {
        try? keychain.set(apiKey, forKey: "\(id)_api_key")
    }

    public func getProviderAPIKey(_ id: String) -> String? {
        try? keychain.getString(forKey: "\(id)_api_key")
    }
}
