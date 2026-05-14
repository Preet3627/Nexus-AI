import AppKit
import Darwin
import Foundation
import LocalAuthentication
import Security
import SwiftUI

private let authBridgeBaseURL = "https://browser.ponsrischool.in"
private let authBridgeAppToken = "comet-secure-v1"
private let authCallbackPath = "/auth/callback"
private let sharedAuthAccount = "default"
private let loopbackHost = "127.0.0.1"
private let loopbackTimeoutSeconds: TimeInterval = 180

enum NativeSettingsDestination: String {
    case provider = "Provider setup"
    case account = "Account connection"
    case appearance = "Appearance tuning"
    case startup = "Startup behavior"
}

private enum SharedAuthStore {
    private static let synchronizable = true
    private static let accessGroup = ProcessInfo.processInfo.environment["SHARED_KEYCHAIN_ACCESS_GROUP"]?
        .trimmingCharacters(in: .whitespacesAndNewlines)

    private static func buildQuery(
        namespace: SharedGoogleAuthNamespace,
        returnData: Bool = false
    ) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: namespace.serviceName,
            kSecAttrAccount as String: sharedAuthAccount,
            kSecUseDataProtectionKeychain as String: true,
            kSecAttrSynchronizable as String: synchronizable ? kCFBooleanTrue as Any : kCFBooleanFalse as Any,
        ]

        if let accessGroup, !accessGroup.isEmpty {
            query[kSecAttrAccessGroup as String] = accessGroup
        }

        if returnData {
            query[kSecReturnData as String] = true
            query[kSecMatchLimit as String] = kSecMatchLimitOne
        }

        return query
    }

    static func save(_ session: SharedGoogleAuthSession, namespace: SharedGoogleAuthNamespace) throws {
        let payload = try JSONEncoder().encode(session)
        let query = buildQuery(namespace: namespace)
        let attributes = [kSecValueData as String: payload]

        let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if updateStatus == errSecSuccess {
            return
        }

        if updateStatus != errSecItemNotFound {
            SecItemDelete(query as CFDictionary)
        }

        var addQuery = query
        addQuery[kSecValueData as String] = payload
        let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw NSError(
                domain: "SharedAuthStore",
                code: Int(addStatus),
                userInfo: [NSLocalizedDescriptionKey: "SecItemAdd failed with status \(addStatus)."]
            )
        }
    }

    static func load(namespace: SharedGoogleAuthNamespace) throws -> SharedGoogleAuthSession? {
        var item: CFTypeRef?
        let status = SecItemCopyMatching(buildQuery(namespace: namespace, returnData: true) as CFDictionary, &item)

        if status == errSecItemNotFound {
            return nil
        }

        guard status == errSecSuccess else {
            throw NSError(
                domain: "SharedAuthStore",
                code: Int(status),
                userInfo: [NSLocalizedDescriptionKey: "SecItemCopyMatching failed with status \(status)."]
            )
        }

        guard let data = item as? Data else {
            throw NSError(
                domain: "SharedAuthStore",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Keychain payload could not be decoded."]
            )
        }

        return try JSONDecoder().decode(SharedGoogleAuthSession.self, from: data)
    }

    static func delete(namespace: SharedGoogleAuthNamespace) {
        SecItemDelete(buildQuery(namespace: namespace) as CFDictionary)
    }
}

private struct LoopbackCallbackServer: Sendable {
    let socketFD: Int32
    let port: UInt16

    init() throws {
        let fd = socket(AF_INET, SOCK_STREAM, 0)
        guard fd >= 0 else {
            throw NSError(
                domain: NSPOSIXErrorDomain,
                code: Int(errno),
                userInfo: [NSLocalizedDescriptionKey: "Unable to create the loopback listener socket."]
            )
        }

        var reuseAddr: Int32 = 1
        setsockopt(
            fd,
            SOL_SOCKET,
            SO_REUSEADDR,
            &reuseAddr,
            socklen_t(MemoryLayout<Int32>.size)
        )

        let currentFlags = fcntl(fd, F_GETFL, 0)
        _ = fcntl(fd, F_SETFL, currentFlags | O_NONBLOCK)

        var address = sockaddr_in()
        address.sin_len = UInt8(MemoryLayout<sockaddr_in>.size)
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = in_port_t(0).bigEndian
        address.sin_addr = in_addr(s_addr: inet_addr(loopbackHost))

        let bindResult = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                bind(fd, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }

        guard bindResult == 0 else {
            let code = errno
            Darwin.close(fd)
            throw NSError(
                domain: NSPOSIXErrorDomain,
                code: Int(code),
                userInfo: [NSLocalizedDescriptionKey: "Unable to bind the loopback callback server."]
            )
        }

        guard listen(fd, 4) == 0 else {
            let code = errno
            Darwin.close(fd)
            throw NSError(
                domain: NSPOSIXErrorDomain,
                code: Int(code),
                userInfo: [NSLocalizedDescriptionKey: "Unable to start the loopback callback listener."]
            )
        }

        var boundAddress = sockaddr_in()
        var boundLength = socklen_t(MemoryLayout<sockaddr_in>.size)
        let nameResult = withUnsafeMutablePointer(to: &boundAddress) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                getsockname(fd, sockaddrPointer, &boundLength)
            }
        }

        guard nameResult == 0 else {
            let code = errno
            Darwin.close(fd)
            throw NSError(
                domain: NSPOSIXErrorDomain,
                code: Int(code),
                userInfo: [NSLocalizedDescriptionKey: "Unable to inspect the loopback callback port."]
            )
        }

        socketFD = fd
        port = UInt16(bigEndian: boundAddress.sin_port)
    }

    func waitForCallback(timeout: TimeInterval) throws -> [String: String] {
        defer { Darwin.close(socketFD) }

        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            var clientAddress = sockaddr()
            var clientLength = socklen_t(MemoryLayout<sockaddr>.size)
            let clientFD = accept(socketFD, &clientAddress, &clientLength)

            if clientFD < 0 {
                if errno == EWOULDBLOCK || errno == EAGAIN {
                    usleep(120_000)
                    continue
                }

                throw NSError(
                    domain: NSPOSIXErrorDomain,
                    code: Int(errno),
                    userInfo: [NSLocalizedDescriptionKey: "The auth callback listener failed while waiting for the browser response."]
                )
            }

            defer { Darwin.close(clientFD) }

            var buffer = [UInt8](repeating: 0, count: 8_192)
            let readCount = recv(clientFD, &buffer, buffer.count, 0)
            guard readCount > 0 else {
                continue
            }

            let request = String(decoding: buffer.prefix(readCount), as: UTF8.self)
            let firstLine = request.components(separatedBy: .newlines).first ?? ""
            let requestPath = firstLine
                .split(separator: " ")
                .dropFirst()
                .first
                .map(String.init) ?? ""

            let params = Self.parseQueryParams(path: requestPath)
            let success = requestPath.hasPrefix(authCallbackPath)
                && params["auth_status"] != "error"
                && params["error"] == nil

            Self.writeHTMLResponse(to: clientFD, success: success)

            if requestPath.hasPrefix(authCallbackPath) {
                return params
            }
        }

        throw NSError(
            domain: "LoopbackCallbackServer",
            code: 408,
            userInfo: [NSLocalizedDescriptionKey: "Timed out waiting for the browser sign-in callback."]
        )
    }

    private static func parseQueryParams(path: String) -> [String: String] {
        guard
            let components = URLComponents(string: "http://\(loopbackHost)\(path)"),
            let items = components.queryItems
        else {
            return [:]
        }

        var params: [String: String] = [:]
        for item in items {
            params[item.name] = item.value ?? ""
        }
        return params
    }

    private static func writeHTMLResponse(to clientFD: Int32, success: Bool) {
        let title = success ? "Nexus AI Sign-In Complete" : "Nexus AI Sign-In Failed"
        let message = success
            ? "You can close this tab and return to Nexus AI."
            : "Something went wrong. Return to Nexus AI to try again."
        let body = """
        <!doctype html>
        <html>
        <head><meta charset="utf-8"><title>\(title)</title></head>
        <body style="font-family:-apple-system,system-ui;padding:32px;background:#0b0d10;color:#f5f7fb">
        <h1>\(title)</h1>
        <p>\(message)</p>
        </body>
        </html>
        """
        let response = """
        HTTP/1.1 200 OK\r
        Content-Type: text/html; charset=utf-8\r
        Content-Length: \(body.utf8.count)\r
        Connection: close\r
        \r
        \(body)
        """
        _ = response.withCString { pointer in
            send(clientFD, pointer, strlen(pointer), 0)
        }
    }
}

@MainActor
final class AppSettings: ObservableObject {
    @Published var query = ""
    @Published var selectedProvider = "Ollama"
    @Published var identityStatus = "Touch ID ready"
    @Published var statusHeadline = "Native command deck online"
    @Published var lastCommandResult = "Native actions can search the web, open apps, adjust volume, and verify Touch ID."
    @Published var isMenuBarIconHidden = false
    @Published var authEmail: String?
    @Published var authStatus = "Not connected"
    @Published var workspaceStatus = "Identity only"
    @Published var authError: String?
    @Published var isIdentityConnected = false
    @Published var isWorkspaceConnected = false
    @Published var isSigningInIdentity = false
    @Published var isSigningInWorkspace = false

    let availableProviders = ["Ollama", "OpenAI", "Anthropic", "Google"]
    let commandHints = [
        "⌃⌃ overlay summon",
        "/signin open browser bridge",
        "/signin workspace sync gmail + drive",
        "/shareauth mirror the same account in Comet-AI",
    ]

    lazy var quickActions: [QuickAction] = [
        QuickAction(
            title: "Connect account",
            subtitle: "Open browser.ponsrischool.in in your default browser and store the shared session locally.",
            command: "/signin",
            symbol: "person.crop.circle.badge.checkmark",
            tint: Color(red: 0.55, green: 0.80, blue: 0.99)
        ),
        QuickAction(
            title: "Connect workspace",
            subtitle: "Grant Gmail and Drive scopes through the shared browser bridge.",
            command: "/signin workspace",
            symbol: "tray.full",
            tint: Color(red: 1.0, green: 0.60, blue: 0.39)
        ),
        QuickAction(
            title: "Search the web",
            subtitle: "Open the default browser from the launcher.",
            command: "/web raycast style translucent mac app",
            symbol: "globe",
            tint: Color(red: 0.49, green: 0.76, blue: 0.63)
        ),
        QuickAction(
            title: "Run shell command",
            subtitle: "Execute a local command and capture the output.",
            command: "/shell uname -a",
            symbol: "terminal",
            tint: Color(red: 0.39, green: 0.58, blue: 1.0)
        ),
    ]

    let presets: [CommandPreset] = [
        CommandPreset(title: "Control twice to open", command: "⌃⌃"),
        CommandPreset(title: "Sign in through browser.ponsrischool.in", command: "/signin"),
        CommandPreset(title: "Verify Touch ID", command: "/touchid Unlock Nexus AI"),
    ]

    init() {
        Task {
            await refreshSharedAuthStatus()
        }
    }

    var authDisplayTitle: String {
        authEmail ?? "Connect account"
    }

    var authDisplaySubtitle: String {
        if isWorkspaceConnected {
            return "Workspace synced through shared iCloud keychain"
        }
        if isIdentityConnected {
            return "Identity stored and ready to share with Comet-AI"
        }
        return "Uses browser.ponsrischool.in instead of a raw Google redirect"
    }

    func apply(_ action: QuickAction) {
        query = action.command
        statusHeadline = action.title
        lastCommandResult = action.subtitle
    }

    func stage(_ preset: CommandPreset) {
        query = preset.command
        statusHeadline = preset.title
        lastCommandResult = "Prepared command \(preset.command)"
    }

    func openSettings(_ destination: NativeSettingsDestination) {
        statusHeadline = destination.rawValue
        lastCommandResult = switch destination {
        case .provider:
            "Choose the active model provider and keep the shell aligned with your preferred stack."
        case .account:
            "Use the same shared browser-based sign-in as Comet-AI and persist the session in the shared keychain."
        case .appearance:
            "Tune shell density, color treatment, and window behavior."
        case .startup:
            "Decide whether Nexus AI should stay menu-bar first or launch into a full shell."
        }
    }

    func runCurrentQuery() {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            statusHeadline = "Type a command first"
            return
        }

        switch trimmed.lowercased() {
        case "/signin", "/signin identity":
            Task { await signInWithBrowserBridge() }
        case "/signin workspace":
            Task { await connectWorkspace() }
        case "/signout", "/logout":
            signOutSharedAccount()
        default:
            statusHeadline = "Command staged"
            lastCommandResult = "Ready to run with \(selectedProvider): \(trimmed)"
        }
    }

    func verifyTouchID() async {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            identityStatus = error?.localizedDescription ?? "Biometric authentication is not available."
            return
        }

        let reason = "Verify your identity before running protected Nexus AI actions."

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            identityStatus = success ? "Touch ID verified" : "Touch ID not verified"
            statusHeadline = success ? "Identity confirmed" : "Identity check failed"
        } catch {
            identityStatus = error.localizedDescription
            statusHeadline = "Touch ID unavailable"
        }
    }

    func signInWithBrowserBridge() async {
        await authenticate(mode: .identity)
    }

    func connectWorkspace() async {
        await authenticate(mode: .workspace)
    }

    func signOutSharedAccount() {
        SharedAuthStore.delete(namespace: .identity)
        SharedAuthStore.delete(namespace: .workspace)
        authEmail = nil
        authStatus = "Not connected"
        workspaceStatus = "Identity only"
        isIdentityConnected = false
        isWorkspaceConnected = false
        authError = nil
        statusHeadline = "Signed out"
        lastCommandResult = "Removed the shared Nexus AI / Comet-AI login from the local keychain."
    }

    func refreshSharedAuthStatus() async {
        do {
            let workspaceSession = try SharedAuthStore.load(namespace: .workspace)
            let identitySession = try SharedAuthStore.load(namespace: .identity)
            let activeSession = workspaceSession ?? identitySession

            authEmail = activeSession?.email
            isIdentityConnected = identitySession != nil || workspaceSession != nil
            isWorkspaceConnected = workspaceSession != nil
            authStatus = isIdentityConnected ? "Connected" : "Not connected"
            workspaceStatus = isWorkspaceConnected ? "Workspace linked" : "Identity only"

            if let email = activeSession?.email, !email.isEmpty {
                lastCommandResult = "Shared session ready for \(email)."
            }
        } catch {
            authError = error.localizedDescription
            authStatus = "Keychain unavailable"
            workspaceStatus = "Identity only"
        }
    }

    private func authenticate(mode: NativeAuthScopeMode) async {
        authError = nil
        setBusy(mode: mode, busy: true)
        defer { setBusy(mode: mode, busy: false) }

        statusHeadline = mode == .identity ? "Opening shared sign-in" : "Opening workspace consent"
        lastCommandResult = "Launching browser.ponsrischool.in in your default browser."

        do {
            let bridgeConfig = try await fetchBridgeConfig()
            guard let googleClientID = bridgeConfig.googleClientId?.trimmingCharacters(in: .whitespacesAndNewlines), !googleClientID.isEmpty else {
                throw NSError(
                    domain: "AppSettings",
                    code: 400,
                    userInfo: [NSLocalizedDescriptionKey: "The auth bridge is missing a Google client ID."]
                )
            }

            let callbackServer = try LoopbackCallbackServer()
            let redirectURI = "http://\(loopbackHost):\(callbackServer.port)\(authCallbackPath)"
            let url = try buildAuthURL(
                mode: mode,
                redirectURI: redirectURI,
                bridgeConfig: bridgeConfig,
                googleClientID: googleClientID
            )

            guard NSWorkspace.shared.open(url) else {
                throw NSError(
                    domain: "AppSettings",
                    code: 500,
                    userInfo: [NSLocalizedDescriptionKey: "Unable to open the browser sign-in URL."]
                )
            }

            let params = try await Task.detached(priority: .userInitiated) {
                try callbackServer.waitForCallback(timeout: loopbackTimeoutSeconds)
            }.value

            if let errorValue = params["error"], !errorValue.isEmpty {
                throw NSError(
                    domain: "AppSettings",
                    code: 401,
                    userInfo: [NSLocalizedDescriptionKey: errorValue]
                )
            }

            if params["auth_status"] == "error" {
                throw NSError(
                    domain: "AppSettings",
                    code: 401,
                    userInfo: [NSLocalizedDescriptionKey: "The shared sign-in did not complete successfully."]
                )
            }

            let session = buildSession(
                params: params,
                requestedScopes: mode.requestedScopes,
                source: "nexus-ai-native"
            )

            try SharedAuthStore.save(session, namespace: mode.namespace)
            if mode == .workspace {
                try SharedAuthStore.save(session, namespace: .identity)
            }

            await refreshSharedAuthStatus()
            statusHeadline = mode == .identity ? "Shared identity connected" : "Workspace connected"
            lastCommandResult = session.email.map {
                "Stored \($0) in the shared keychain so Nexus AI and Comet-AI resolve the same account."
            } ?? "Stored the shared browser session in the keychain."
        } catch {
            authError = error.localizedDescription
            statusHeadline = "Sign-in failed"
            lastCommandResult = error.localizedDescription
        }
    }

    private func fetchBridgeConfig() async throws -> AuthBridgeConfigResponse {
        var request = URLRequest(url: URL(string: "\(authBridgeBaseURL)/api/config")!)
        request.setValue(authBridgeAppToken, forHTTPHeaderField: "X-Comet-App-Token")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200 ..< 300).contains(httpResponse.statusCode) else {
            throw NSError(
                domain: "AppSettings",
                code: 502,
                userInfo: [NSLocalizedDescriptionKey: "Failed to reach the browser auth bridge configuration endpoint."]
            )
        }

        return try JSONDecoder().decode(AuthBridgeConfigResponse.self, from: data)
    }

    private func buildAuthURL(
        mode: NativeAuthScopeMode,
        redirectURI: String,
        bridgeConfig: AuthBridgeConfigResponse,
        googleClientID _: String
    ) throws -> URL {
        switch mode {
        case .identity:
            var components = URLComponents(string: "\(authBridgeBaseURL)/auth")
            components?.queryItems = [
                URLQueryItem(name: "client_id", value: "nexus-ai-native"),
                URLQueryItem(name: "redirect_uri", value: redirectURI),
            ]

            if let firebaseConfig = bridgeConfig.firebaseConfig.flatMap(encodedFirebaseConfig) {
                components?.queryItems?.append(
                    URLQueryItem(name: "firebase_config", value: firebaseConfig)
                )
            }

            guard let url = components?.url else {
                throw NSError(
                    domain: "AppSettings",
                    code: 500,
                    userInfo: [NSLocalizedDescriptionKey: "Unable to construct the identity sign-in URL."]
                )
            }
            return url
        case .workspace:
            var components = URLComponents(string: "\(authBridgeBaseURL)/api/auth/google")
            components?.queryItems = [
                URLQueryItem(name: "redirect_uri", value: redirectURI),
                URLQueryItem(name: "scopes", value: mode.requestedScopes.joined(separator: " ")),
            ]

            if let firebaseConfig = bridgeConfig.firebaseConfig.flatMap(encodedFirebaseConfig) {
                components?.queryItems?.append(
                    URLQueryItem(name: "firebase_config", value: firebaseConfig)
                )
            }

            guard let url = components?.url else {
                throw NSError(
                    domain: "AppSettings",
                    code: 500,
                    userInfo: [NSLocalizedDescriptionKey: "Unable to construct the workspace consent URL."]
                )
            }
            return url
        }
    }

    private func encodedFirebaseConfig(_ config: AuthBridgeFirebaseConfig) -> String? {
        guard let data = try? JSONEncoder().encode(config), !data.isEmpty else {
            return nil
        }
        return data.base64EncodedString()
    }

    private func buildSession(
        params: [String: String],
        requestedScopes: [String],
        source: String
    ) -> SharedGoogleAuthSession {
        let scopes = params["scope"]?
            .split(whereSeparator: \.isWhitespace)
            .map(String.init)
            .filter { !$0.isEmpty } ?? requestedScopes

        let expiresAt = params["expires_in"]
            .flatMap(Int64.init)
            .map { Int64(Date().timeIntervalSince1970) + max(0, $0 - 60) }

        return SharedGoogleAuthSession(
            uid: params["uid"] ?? params["user_id"],
            email: params["email"],
            name: params["name"],
            photo: params["photo"],
            access_token: params["token"] ?? params["access_token"],
            refresh_token: params["refresh_token"],
            id_token: params["id_token"],
            expires_at: expiresAt,
            scopes: scopes.isEmpty ? requestedScopes : scopes,
            firebase_config: params["firebase_config"],
            source: source
        )
    }

    private func setBusy(mode: NativeAuthScopeMode, busy: Bool) {
        switch mode {
        case .identity:
            isSigningInIdentity = busy
        case .workspace:
            isSigningInWorkspace = busy
        }
    }
}
