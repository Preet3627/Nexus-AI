import Foundation
import LocalAuthentication

@MainActor
public final class BiometricAuthService: ObservableObject {
    @Published public private(set) var biometryType: LABiometryType = .none
    @Published public private(set) var isAvailable: Bool = false
    @Published public private(set) var errorMessage: String?

    private let context = LAContext()

    public init() {
        checkAvailability()
    }

    public func checkAvailability() {
        var error: NSError?
        isAvailable = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
        biometryType = context.biometryType
        
        if let error = error {
            errorMessage = error.localizedDescription
        }
    }

    public var biometryName: String {
        switch biometryType {
        case .touchID:
            return "Touch ID"
        case .faceID:
            return "Face ID"
        case .opticID:
            return "Optic ID"
        case .none:
            return "Passcode"
        @unknown default:
            return "Biometrics"
        }
    }

    public func authenticate(reason: String) async -> Bool {
        let newContext = LAContext()
        newContext.localizedCancelTitle = "Cancel"
        
        do {
            return try await newContext.evaluatePolicy(
                .deviceOwnerAuthentication,
                localizedReason: reason
            )
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    public func authenticateWithFallback(reason: String) async -> Bool {
        await authenticate(reason: reason)
    }
}
