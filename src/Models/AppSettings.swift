import Foundation

public struct AppSettings: Codable {
    public var security: SecuritySettings
    public var appearance: AppearanceSettings
    public var llm: LLMSettings
    public var comet: CometSettings

    public struct SecuritySettings: Codable {
        public var requireAuthOnLaunch: Bool
        public var authTimeout: Int
        public var storageBackend: StorageBackend
        public var enableCloudSync: Bool
        public var biometricType: BiometricType

        public enum StorageBackend: String, Codable {
            case secureEnclave
            case keychain
        }

        public enum BiometricType: String, Codable {
            case none
            case touchID
            case faceID
        }

        public init(
            requireAuthOnLaunch: Bool = true,
            authTimeout: Int = 300,
            storageBackend: StorageBackend = .secureEnclave,
            enableCloudSync: Bool = false,
            biometricType: BiometricType = .none
        ) {
            self.requireAuthOnLaunch = requireAuthOnLaunch
            self.authTimeout = authTimeout
            self.storageBackend = storageBackend
            self.enableCloudSync = enableCloudSync
            self.biometricType = biometricType
        }
    }

    public struct AppearanceSettings: Codable {
        public var theme: Theme
        public var fontSize: Int
        public var showTimestamps: Bool

        public enum Theme: String, Codable {
            case system
            case dark
            case light
        }

        public init(
            theme: Theme = .dark,
            fontSize: Int = 14,
            showTimestamps: Bool = true
        ) {
            self.theme = theme
            self.fontSize = fontSize
            self.showTimestamps = showTimestamps
        }
    }

    public struct LLMSettings: Codable {
        public var activeProvider: String
        public var streamResponses: Bool

        public init(
            activeProvider: String = "ollama",
            streamResponses: Bool = true
        ) {
            self.activeProvider = activeProvider
            self.streamResponses = streamResponses
        }
    }

    public struct CometSettings: Codable {
        public var autoLaunch: Bool
        public var port: Int

        public init(
            autoLaunch: Bool = true,
            port: Int = 3004
        ) {
            self.autoLaunch = autoLaunch
            self.port = port
        }
    }

    public init(
        security: SecuritySettings = SecuritySettings(),
        appearance: AppearanceSettings = AppearanceSettings(),
        llm: LLMSettings = LLMSettings(),
        comet: CometSettings = CometSettings()
    ) {
        self.security = security
        self.appearance = appearance
        self.llm = llm
        self.comet = comet
    }

    public static let `default` = AppSettings()
}
