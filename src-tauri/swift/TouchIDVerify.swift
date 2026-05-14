import Foundation
import LocalAuthentication

struct TouchIDVerification: Codable {
    let verified: Bool
    let biometry: String
    let message: String
}

let reason = CommandLine.arguments.dropFirst().joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
let prompt = reason.isEmpty ? "Authenticate to continue in Nexus AI." : reason

let context = LAContext()
var error: NSError?

func printPayload(_ payload: TouchIDVerification) {
    let encoder = JSONEncoder()
    let data = try! encoder.encode(payload)
    print(String(data: data, encoding: .utf8)!)
}

let biometryLabel: String = {
    switch context.biometryType {
    case .touchID:
        return "Touch ID"
    case .faceID:
        return "Face ID"
    default:
        return "Biometrics"
    }
}()

guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
    printPayload(
        TouchIDVerification(
            verified: false,
            biometry: biometryLabel,
            message: error?.localizedDescription ?? "Biometric authentication is not available."
        )
    )
    exit(0)
}

let semaphore = DispatchSemaphore(value: 0)
var verification = TouchIDVerification(
    verified: false,
    biometry: biometryLabel,
    message: "Authentication was cancelled."
)

context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: prompt) { success, authError in
    verification = TouchIDVerification(
        verified: success,
        biometry: biometryLabel,
        message: authError?.localizedDescription ?? (success ? "Authentication succeeded." : "Authentication failed.")
    )
    semaphore.signal()
}

_ = semaphore.wait(timeout: .now() + 30)
printPayload(verification)
