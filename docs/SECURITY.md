# Nexus-AI Security Documentation

> Comprehensive security architecture and implementation guide

---

## 🔐 Security Overview

Nexus-AI implements enterprise-grade security with multiple layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Defense in Depth                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Authentication                                         │
│  └─→ Touch ID / Face ID / Passcode                             │
│                                                                  │
│  Layer 2: Key Storage                                            │
│  └─→ Secure Enclave / Keychain                                 │
│                                                                  │
│  Layer 3: Encryption                                             │
│  └─→ AES-256-GCM (CryptoKit)                                   │
│                                                                  │
│  Layer 4: Data Protection                                         │
│  └─→ Encrypted storage, secure deletion                        │
│                                                                  │
│  Layer 5: Permissions                                           │
│  └─→ TCC gating for sensitive operations                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Authentication

### Framework: LocalAuthentication

### Implementation

```swift
import LocalAuthentication

class BiometricAuth {
    private let context = LAContext()
    
    // Check if biometrics available
    func canAuthenticate() -> (available: Bool, error: String?) {
        var error: NSError?
        let canEvaluate = context.canEvaluatePolicy(
            .deviceOwnerAuthentication,
            error: &error
        )
        return (canEvaluate, error?.localizedDescription)
    }
    
    // Get biometry type
    func getBiometryType() -> String {
        switch context.biometryType {
        case .touchID: return "Touch ID"
        case .faceID: return "Face ID"
        case .opticID: return "Optic ID"
        case .none: return "Passcode"
        @unknown default: return "Unknown"
        }
    }
    
    // Authenticate
    func authenticate(reason: String) async -> Bool {
        do {
            return try await context.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )
        } catch {
            return false
        }
    }
}
```

### Policy Options

| Policy | Description | Use Case |
|--------|-------------|----------|
| `.deviceOwnerAuthentication` | Biometrics OR passcode | Default, recommended |
| `.deviceOwnerAuthenticationWithBiometrics` | Biometrics ONLY | High security |

### User Settings

```swift
enum AuthFrequency {
    case always          // Every action
    case session         // Once per app session
    case timed(minutes: Int)  // Allow for N minutes
    case alwaysAllow     // Never ask (dangerous)
}
```

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Authentication Flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  App Launch                                                      │
│     │                                                            │
│     ↓                                                            │
│  ┌─────────────────┐                                            │
│  │ Check Settings   │                                            │
│  │ "Require Auth"  │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ├─── OFF ────→ Allow Access (⚠️ Not Recommended)      │
│           │                                                        │
│           └─── ON ────→ Request Authentication                   │
│                              │                                    │
│                              ↓                                    │
│                    ┌─────────────────┐                          │
│                    │ Touch ID/Face ID│                          │
│                    └────────┬────────┘                          │
│                             │                                     │
│              ┌──────────────┼──────────────┐                     │
│              │              │              │                     │
│         Success        Failed        Cancel                     │
│              │              │              │                     │
│              ↓              ↓              ↓                     │
│        ┌─────────┐  ┌──────────┐  ┌──────────┐                │
│        │ Allow   │  │Try Passcode│  │  Deny   │                │
│        │ Access  │  │  (FB)    │  │ Access  │                │
│        └─────────┘  └────┬─────┘  └──────────┘                │
│                          │                                      │
│                    Success ───→ Allow Access                    │
│                    Failed ────→ Show Error                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Keychain Storage

### Framework: Security + KeychainAccess (Swift Package)

### Implementation

```swift
import KeychainAccess

class KeychainManager {
    private let keychain: Keychain
    
    init(syncWithCloud: Bool = false) {
        self.keychain = Keychain(service: "com.nexus-ai.app")
            .accessibility(.whenUnlockedThisDeviceOnly)
        
        if syncWithCloud {
            self.keychain = self.keychain.synchronizable(true)
        }
    }
    
    // Store API key with biometric protection
    func storeAPIKey(_ key: String, provider: String, biometric: Bool = true) throws {
        var kc = keychain
            .label("\(provider) API Key")
            .comment("Nexus-AI \(provider) configuration")
        
        if biometric {
            kc = kc.accessibility(
                .whenUnlockedThisDeviceOnly,
                authenticationPolicy: .biometryAny
            )
        }
        
        try kc.set(key, key: "\(provider)_api_key")
    }
    
    // Retrieve API key
    func getAPIKey(provider: String) throws -> String? {
        return try keychain
            .authenticationPrompt("Authenticate to access \(provider) API key")
            .get("\(provider)_api_key")
    }
    
    // Delete API key
    func deleteAPIKey(provider: String) throws {
        try keychain.remove("\(provider)_api_key")
    }
}
```

### Accessibility Levels

| Level | iCloud Sync | Description |
|-------|-------------|-------------|
| `.whenUnlocked` | Yes | After device unlock |
| `.whenUnlockedThisDeviceOnly` | No | Most secure, local only |
| `.afterFirstUnlock` | Yes | After first unlock ever |
| `.whenPasscodeSetThisDeviceOnly` | No | Only with passcode |

### Biometric Policies

| Policy | Description |
|--------|-------------|
| `.biometryAny` | Touch ID or Face ID |
| `.biometryCurrentSet` | Current biometric enrollment |
| `.devicePasscode` | Device passcode |

---

## 3. Secure Enclave

### Framework: Security

### Implementation

```swift
import Security
import CryptoKit

class SecureEnclaveManager {
    private let tag = "com.nexus-ai.secure-key".data(using: .utf8)!
    
    // Check if Secure Enclave available
    func isAvailable() -> Bool {
        if #available(macOS 10.15, *) {
            return SecureEnclave.isAvailable
        }
        return false
    }
    
    // Create key in Secure Enclave
    func createKey() throws -> SecKey {
        // Create access control
        var error: Unmanaged<CFError>?
        guard let access = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            [.privateKeyUsage, .biometryAny],
            &error
        ) else {
            throw SecureEnclaveError.accessControlCreationFailed
        }
        
        // Create key attributes
        let attributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeySizeInBits as String: 256,
            kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: true,
                kSecAttrApplicationTag as String: tag,
                kSecAttrAccessControl as String: access
            ]
        ]
        
        // Generate key
        guard let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error) else {
            throw SecureEnclaveError.keyCreationFailed
        }
        
        return privateKey
    }
    
    // Retrieve key
    func getKey() throws -> SecKey? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecAttrApplicationTag as String: tag,
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecReturnRef as String: true
        ]
        
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        
        if status == errSecSuccess {
            return (item as! SecKey)
        } else if status == errSecItemNotFound {
            return nil
        } else {
            throw SecureEnclaveError.keyRetrievalFailed(status)
        }
    }
}
```

### Key Derivation

```swift
class KeyDerivation {
    // Derive AES-256 key from Secure Enclave key
    func deriveSymmetricKey(from privateKey: SecKey) throws -> SymmetricKey {
        guard let publicKey = SecKeyCopyPublicKey(privateKey) else {
            throw KeyDerivationError.publicKeyExtractionFailed
        }
        
        var error: Unmanaged<CFError>?
        guard let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, &error) as Data? else {
            throw KeyDerivationError.keyExtractionFailed
        }
        
        // Use SHA256 to derive 256-bit key
        let keyData = SHA256.hash(data: publicKeyData)
        return SymmetricKey(data: keyData)
    }
}
```

---

## 4. AES-256-GCM Encryption

### Framework: CryptoKit

### Implementation

```swift
import CryptoKit

class SecureStorage {
    private let key: SymmetricKey
    
    init(keyData: Data) {
        self.key = SymmetricKey(data: keyData)
    }
    
    // Encrypt data
    func encrypt(_ plaintext: Data) throws -> Data {
        let sealedBox = try AES.GCM.seal(plaintext, using: key)
        guard let combined = sealedBox.combined else {
            throw EncryptionError.combinedDataCreationFailed
        }
        return combined
    }
    
    // Decrypt data
    func decrypt(_ ciphertext: Data) throws -> Data {
        let sealedBox = try AES.GCM.SealedBox(combined: ciphertext)
        return try AES.GCM.open(sealedBox, using: key)
    }
    
    // Encrypt string
    func encryptString(_ string: String) throws -> Data {
        guard let data = string.data(using: .utf8) else {
            throw EncryptionError.encodingFailed
        }
        return try encrypt(data)
    }
    
    // Decrypt to string
    func decryptString(_ ciphertext: Data) throws -> String {
        let data = try decrypt(ciphertext)
        guard let string = String(data: data, encoding: .utf8) else {
            throw EncryptionError.decodingFailed
        }
        return string
    }
}
```

### Encrypted Storage

```swift
class EncryptedStorage {
    private let storage: SecureStorage
    
    // Save encrypted conversation
    func saveConversation(_ conversation: Conversation) throws {
        let encoder = JSONEncoder()
        let data = try encoder.encode(conversation)
        let encrypted = try storage.encrypt(data)
        
        let url = getConversationURL(conversation.id)
        try encrypted.write(to: url)
    }
    
    // Load encrypted conversation
    func loadConversation(id: String) throws -> Conversation {
        let url = getConversationURL(id)
        let encrypted = try Data(contentsOf: url)
        let data = try storage.decrypt(encrypted)
        
        let decoder = JSONDecoder()
        return try decoder.decode(Conversation.self, from: data)
    }
}
```

### Versioned Encryption

```swift
struct EncryptedPayload: Codable {
    let version: Int
    let ciphertext: Data
    let createdAt: Date
    
    static func create(plaintext: Data, storage: SecureStorage) throws -> EncryptedPayload {
        EncryptedPayload(
            version: 1,
            ciphertext: try storage.encrypt(plaintext),
            createdAt: Date()
        )
    }
    
    func decrypt(storage: SecureStorage) throws -> Data {
        guard version == 1 else {
            throw EncryptionError.unsupportedVersion(version)
        }
        return try storage.decrypt(ciphertext)
    }
}
```

---

## 5. TCC Permissions

### Required Permissions

| Permission | Framework | Purpose | Required |
|------------|-----------|---------|----------|
| Accessibility | ApplicationServices | Control apps, hotkey | Yes |
| Screen Recording | ScreenCaptureKit | Screenshots | Yes |
| Microphone | AVFoundation | Voice input | Optional |
| Camera | AVFoundation | Video input | Optional |

### Permission Manager

```swift
import ScreenCaptureKit
import ApplicationServices

class PermissionManager {
    // Check Accessibility
    func hasAccessibilityPermission() -> Bool {
        AXIsProcessTrusted()
    }
    
    // Request Accessibility
    func requestAccessibilityPermission() {
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        AXIsProcessTrustedWithOptions(options as CFDictionary)
    }
    
    // Check Screen Recording
    @available(macOS 12.3, *)
    func hasScreenRecordingPermission() async -> Bool {
        do {
            let _ = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
            return true
        } catch {
            return false
        }
    }
    
    // Request Screen Recording
    func requestScreenRecordingPermission() {
        CGRequestScreenCaptureAccess()
    }
    
    // Open Privacy Settings
    func openPrivacySettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy") {
            NSWorkspace.shared.open(url)
        }
    }
}
```

### Permission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission Flow                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  App Launch                                                      │
│     │                                                            │
│     ↓                                                            │
│  ┌─────────────────┐                                            │
│  │ Check All Perms │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│     ┌─────┴─────┐                                              │
│     │           │                                              │
│   Missing    All OK                                            │
│     │           │                                              │
│     ↓           ↓                                              │
│  ┌─────────────────────┐                                     │
│  │ Show Permissions UI  │                                     │
│  └───────────┬───────────┘                                     │
│              │                                                  │
│     ┌────────┴────────┐                                        │
│     │                 │                                        │
│  Request           Skip                                        │
│     │                 │                                        │
│     ↓                 ↓                                        │
│  ┌──────────┐  ┌────────────┐                                │
│  │  System  │  │ Limited    │                                │
│  │  Prompt  │  │  Feature   │                                │
│  └────┬─────┘  └────────────┘                                │
│       │                                                       │
│   ┌───┴───┐                                                  │
│   │       │                                                  │
│ Granted  Denied                                               │
│   │       │                                                  │
│   ↓       ↓                                                   │
│  Full   Show Settings                                         │
│ Access  Link                                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Complete Security Module

### SwiftUI ViewModel

```swift
import SwiftUI
import LocalAuthentication

@MainActor
class SecurityViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var biometryType = "Unknown"
    @Published var authFrequency: AuthFrequency = .session
    
    private let authManager = BiometricAuth()
    private let keychainManager = KeychainManager()
    private let secureStorage: SecureStorage
    
    init() {
        self.secureStorage = SecureStorage(keyData: getOrCreateKey())
        checkBiometry()
    }
    
    func checkBiometry() {
        let (available, _) = authManager.canAuthenticate()
        biometryType = authManager.getBiometryType()
        isAuthenticated = !available // No auth needed if unavailable
    }
    
    func authenticate() async -> Bool {
        guard authFrequency != .alwaysAllow else { return true }
        
        let reason = "Authenticate to access Nexus-AI"
        let result = await authManager.authenticate(reason: reason)
        isAuthenticated = result
        return result
    }
    
    func lock() {
        isAuthenticated = false
    }
}
```

---

## 📋 Security Checklist

### Development
- [ ] All API keys stored in Keychain with biometric protection
- [ ] No sensitive data in UserDefaults
- [ ] No secrets in source code
- [ ] Secure random number generation (SecRandomCopyBytes)
- [ ] Proper error handling (no stack traces in production)

### Storage
- [ ] AES-256-GCM for all persisted data
- [ ] Encrypted SQLite database
- [ ] Secure key storage (Secure Enclave or Keychain)
- [ ] Proper key rotation strategy
- [ ] Secure deletion (overwrite before delete)

### Network
- [ ] HTTPS only
- [ ] Certificate pinning for API calls
- [ ] No sensitive data in URLs
- [ ] Request/response encryption

### Permissions
- [ ] TCC permission checks before sensitive operations
- [ ] Graceful degradation when permissions denied
- [ ] Clear user guidance for granting permissions

### Memory
- [ ] Minimize plaintext in memory
- [ ] Clear sensitive data after use
- [ ] No logging of sensitive information

---

## 🔒 Security Testing

### Automated Tests

```bash
# Run security tests
cargo test --lib security
npm run test:security
```

### Manual Testing Checklist

- [ ] Verify encryption at rest
- [ ] Test biometric fallback to passcode
- [ ] Verify Secure Enclave fallback
- [ ] Test permission denial handling
- [ ] Verify no sensitive data in crash logs
- [ ] Test keychain access from debugger
- [ ] Verify iCloud sync encryption

---

## 📚 References

- [Apple Security Documentation](https://developer.apple.com/documentation/security)
- [CryptoKit Documentation](https://developer.apple.com/documentation/cryptokit)
- [LocalAuthentication Documentation](https://developer.apple.com/documentation/localauthentication)
- [Keychain Services Documentation](https://developer.apple.com/documentation/security/keychain-services)
- [TCC Documentation](https://developer.apple.com/documentation/tcc)

---

## 🚨 Vulnerability Reporting

If you discover a security vulnerability, please report it to:
- **Email:** security@nexus-ai.app
- **GitHub:** [Security Advisories](https://github.com/yourusername/Nexus-AI/security/advisories)

Please do not disclose vulnerabilities publicly until we have had a chance to address them.

---

*Last Updated: 2026-04-15*
*Version: 1.0*
