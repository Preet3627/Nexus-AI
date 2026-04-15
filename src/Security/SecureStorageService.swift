import Foundation
import Security
import CryptoKit

public final class SecureStorageService {
    private let keychain: KeychainService
    private var encryptionKey: SymmetricKey?

    public init(keychain: KeychainService = KeychainService()) {
        self.keychain = keychain
        loadOrCreateKey()
    }

    private func loadOrCreateKey() {
        if let keyData = try? keychain.getData(forKey: "nexus_encryption_key") {
            encryptionKey = SymmetricKey(data: keyData)
        } else {
            let newKey = SymmetricKey(size: .bits256)
            let keyData = newKey.withUnsafeBytes { Data($0) }
            try? keychain.set(keyData, forKey: "nexus_encryption_key")
            encryptionKey = newKey
        }
    }

    public func encrypt(_ data: Data) throws -> Data {
        guard let key = encryptionKey else {
            throw SecureStorageError.keyNotAvailable
        }
        let sealedBox = try AES.GCM.seal(data, using: key)
        guard let combined = sealedBox.combined else {
            throw SecureStorageError.encryptionFailed
        }
        return combined
    }

    public func decrypt(_ data: Data) throws -> Data {
        guard let key = encryptionKey else {
            throw SecureStorageError.keyNotAvailable
        }
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        return try AES.GCM.open(sealedBox, using: key)
    }

    public func encryptString(_ string: String) throws -> Data {
        guard let data = string.data(using: .utf8) else {
            throw SecureStorageError.encodingFailed
        }
        return try encrypt(data)
    }

    public func decryptString(_ data: Data) throws -> String {
        let decrypted = try decrypt(data)
        guard let string = String(data: decrypted, encoding: .utf8) else {
            throw SecureStorageError.decodingFailed
        }
        return string
    }

    public enum SecureStorageError: Error, LocalizedError {
        case keyNotAvailable
        case encryptionFailed
        case decryptionFailed
        case encodingFailed
        case decodingFailed

        public var errorDescription: String? {
            switch self {
            case .keyNotAvailable: return "Encryption key not available"
            case .encryptionFailed: return "Failed to encrypt data"
            case .decryptionFailed: return "Failed to decrypt data"
            case .encodingFailed: return "Failed to encode string"
            case .decodingFailed: return "Failed to decode string"
            }
        }
    }
}
