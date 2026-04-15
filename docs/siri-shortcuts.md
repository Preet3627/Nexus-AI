# Siri Shortcuts & Voice Commands

Nexus-AI integrates deeply with macOS Siri and Shortcuts, providing powerful voice-controlled automation with Touch ID security.

## Overview

Using **App Intents** (macOS 13+), Nexus-AI provides:

- Voice-activated commands via Siri
- Shortcuts app integration
- Background AI processing
- Touch ID protected actions
- System control capabilities

## Voice Commands

### AI Queries
> "Ask Nexus to summarize my emails"  
> "Tell Nexus to analyze this screenshot"  
> "Nexus what meetings do I have today?"

**Features:**
- Background processing
- Screenshot capture option
- Priority levels (low/normal/high)
- Response caching

### System Control

#### Volume
> "Set volume to 50% with Nexus"  
> "Mute with Nexus"  
> "Increase volume with Nexus"

#### Brightness
> "Set brightness to 75% with Nexus"  
> "Dim screen with Nexus"  
> "Brighten with Nexus"

#### Quick Actions
> "Lock screen with Nexus"  
> "Empty trash with Nexus"  
> "Take screenshot with Nexus"

## App Intents

### Available Intents

| Intent | Description | Parameters |
|--------|-------------|------------|
| `AskNexusAdvancedIntent` | Query AI in background | `query`, `screenshot`, `priority` |
| `OpenAppIntent` | Open any application | `appName` |
| `ControlVolumeIntent` | Set/mute volume | `action`, `percentage` |
| `ControlBrightnessIntent` | Adjust screen brightness | `action`, `percentage` |
| `ReadFileIntent` | Read file contents | `filepath`, `maxLines` |
| `ExecuteShellSecureIntent` | Run shell with Touch ID | `command`, `requireTouchID` |
| `TakeScreenshotIntent` | Capture screen | `captureMode` |
| `QuickActionIntent` | Common system actions | `action` |

## Siri Phrases

### Show/Activate
```
"Show Nexus-AI"
"Open Nexus-AI"
"Activate Nexus-AI"
"Talk to Nexus"
```

### AI Queries
```
"Ask Nexus to {query}"
"Tell Nexus to {query}"
"Query Nexus with {query}"
"Nexus {query}"
```

### Open Apps
```
"Open {app name} with Nexus"
"Launch {app name} with Nexus"
```

### Volume Control
```
"Set volume to {n} percent with Nexus"
"Mute with Nexus"
"Unmute with Nexus"
"Volume up/down with Nexus"
```

### Brightness Control
```
"Set brightness to {n} percent with Nexus"
"Dim screen with Nexus"
"Brighten screen with Nexus"
```

### Shell Commands (Secure)
```
"Run {command} with Nexus"
"Execute {command} securely with Nexus"
```

## Touch ID Security

### Protected Actions

Some actions require Touch ID authentication:

1. **Shell Command Execution** - Prevents unauthorized command execution
2. **Empty Trash** - Confirmation for destructive actions
3. **System Changes** - Restart, shutdown, sleep

### Authentication Flow

```
User: "Run rm -rf downloads with Nexus"
     ↓
Nexus: "Authenticate to run this command"
     ↓
User: [Touch ID]
     ↓
Nexus: Command executed (or blocked if dangerous)
```

### Security Features

- **Command Validation**: Blocks dangerous commands
- **Pattern Matching**: Prevents malicious code
- **Biometric Fallback**: Passcode if biometrics unavailable
- **Audit Logging**: All commands logged

## Background Processing

Nexus-AI processes commands in the background:

```swift
@available(macOS 13.0, *)
struct AskNexusAdvancedIntent: AppIntent {
    static var openAppWhenRun: Bool = false  // Runs in background
    
    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        // Process in background
        NotificationCenter.default.post(name: .nexusAIQuery, ...)
        
        // Wait for response with timeout
        let response = await waitForResponse(taskId: taskId)
        return .result(value: response)
    }
}
```

## Shortcuts App Integration

### Adding to Shortcuts

1. Open **Shortcuts** app
2. Tap **+** to create new shortcut
3. Search for **Nexus-AI**
4. Add desired action

### Example Shortcuts

#### Morning Briefing
```
1. Get Current Weather
2. Ask Nexus: "Summarize my calendar for today"
3. Ask Nexus: "Any urgent emails?"
4. Open App: Calendar
```

#### Quick Status Check
```
1. Ask Nexus: "System status report"
2. Show Notification
```

#### Screenshot Analysis
```
1. Screenshot with Nexus
2. Ask Nexus: "Analyze this screenshot"
3. Copy Result to Clipboard
```

## System Control Examples

### Volume Control
```swift
// Set to 50%
Set volume to 50% with Nexus

// Mute
Mute with Nexus

// Increase
Volume up with Nexus
```

### Brightness Control
```swift
// Set to 75%
Set brightness to 75% with Nexus

// Dim for night
Dim screen with Nexus
```

### Quick Actions
```swift
// Lock screen
Lock screen with Nexus

// Empty trash (requires Touch ID)
Empty trash with Nexus

// Screenshot
Screenshot with Nexus
```

## File Reading

```swift
// Read file
Read ~/Documents/notes.txt with Nexus

// With line limit
Read ~/Documents/log.txt with Nexus (max 100 lines)
```

## Shell Command Execution

```swift
// With Touch ID
Run ls -la ~/Documents with Nexus

// Without Touch ID
Run echo "Hello" with Nexus (requireTouchID: false)
```

### Allowed Commands
```bash
ls -la
cat filename
grep pattern file
find . -name pattern
du -sh
ps aux
top -l 1
```

### Blocked Commands
```bash
rm -rf /        # Dangerous
dd if=...       # Disk write
mkfs            # Format
:(){:|:&};:     # Fork bomb
curl | sh       # Pipe to shell
```

## Advanced Features

### Priority Levels
```swift
enum TaskPriority {
    case low      // Queued, lower priority
    case normal   // Default
    case high     // Immediate processing
}
```

### Screenshot Capture Modes
```swift
enum CaptureMode {
    case fullScreen  // Entire screen
    case selection   // User selection
    case window      // Focused window
}
```

## Troubleshooting

### Siri Not Recognizing
1. Update to latest Nexus-AI
2. Check System Settings → Siri
3. Say "Show me what you can do"

### Intent Not Found
1. Open Shortcuts app
2. Search for Nexus-AI actions
3. Add to your shortcut manually

### Touch ID Not Working
1. System Settings → Touch ID
2. Add fingerprint
3. Enable "Use Touch ID for..."

### Command Blocked
1. Command matches security pattern
2. Try simpler command
3. Use Shortcuts app for complex tasks

## Best Practices

1. **Use Voice for Quick Actions**: "Mute with Nexus"
2. **Use Shortcuts for Complex Flows**: Chain multiple actions
3. **Enable Touch ID**: For sensitive operations
4. **Test Commands**: Run manually before voice activation
5. **Monitor Logs**: Check System Settings → Privacy → Analytics
