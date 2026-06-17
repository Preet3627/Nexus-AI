import Foundation
import Security

struct KeychainResponse: Codable {
    let success: Bool
    let found: Bool?
    let value: String?
    let error: String?
}

func emit(_ response: KeychainResponse) {
    let encoder = JSONEncoder()
    let data = try! encoder.encode(response)
    print(String(data: data, encoding: .utf8)!)
}

let args = Array(CommandLine.arguments.dropFirst())

guard args.count >= 4 else {
    emit(KeychainResponse(success: false, found: nil, value: nil, error: "Usage: SharedKeychain.swift <get|set|delete> <service> <account> <synchronizable:0|1> [accessGroup] [base64Value]"))
    exit(1)
}

let action = args[0]
let service = args[1]
let account = args[2]
let synchronizable = args[3] == "1"
let accessGroup = args.count > 4 ? args[4] : ""
let base64Value = args.count > 5 ? args[5] : ""

func buildQuery(returnData: Bool = false) -> [String: Any] {
    var query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrAccount as String: account
    ]

    query[kSecAttrSynchronizable as String] = synchronizable ? kCFBooleanTrue : kCFBooleanFalse

    if !accessGroup.isEmpty {
        query[kSecAttrAccessGroup as String] = accessGroup
    }

    if returnData {
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
    }

    return query
}

switch action {
case "get":
    var item: CFTypeRef?
    let status = SecItemCopyMatching(buildQuery(returnData: true) as CFDictionary, &item)

    if status == errSecItemNotFound {
        emit(KeychainResponse(success: true, found: false, value: nil, error: nil))
        exit(0)
    }

    guard status == errSecSuccess else {
        emit(KeychainResponse(success: false, found: nil, value: nil, error: "SecItemCopyMatching failed with status \(status)"))
        exit(1)
    }

    guard let data = item as? Data, let value = String(data: data, encoding: .utf8) else {
        emit(KeychainResponse(success: false, found: nil, value: nil, error: "Stored value could not be decoded as UTF-8"))
        exit(1)
    }

    emit(KeychainResponse(success: true, found: true, value: value, error: nil))

case "set":
    guard let decoded = Data(base64Encoded: base64Value) else {
        emit(KeychainResponse(success: false, found: nil, value: nil, error: "Invalid base64 payload"))
        exit(1)
    }

    let query = buildQuery()
    let attributes: [String: Any] = [kSecValueData as String: decoded]
    let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

    if updateStatus == errSecSuccess {
        emit(KeychainResponse(success: true, found: true, value: nil, error: nil))
        exit(0)
    }

    if updateStatus != errSecItemNotFound {
        SecItemDelete(query as CFDictionary)
    }

    var addQuery = query
    addQuery[kSecValueData as String] = decoded
    let addStatus = SecItemAdd(addQuery as CFDictionary, nil)

    guard addStatus == errSecSuccess else {
        emit(KeychainResponse(success: false, found: nil, value: nil, error: "SecItemAdd failed with status \(addStatus)"))
        exit(1)
    }

    emit(KeychainResponse(success: true, found: true, value: nil, error: nil))

case "delete":
    let status = SecItemDelete(buildQuery() as CFDictionary)

    guard status == errSecSuccess || status == errSecItemNotFound else {
        emit(KeychainResponse(success: false, found: nil, value: nil, error: "SecItemDelete failed with status \(status)"))
        exit(1)
    }

    emit(KeychainResponse(success: true, found: status == errSecSuccess, value: nil, error: nil))

default:
    emit(KeychainResponse(success: false, found: nil, value: nil, error: "Unknown action \(action)"))
    exit(1)
}
