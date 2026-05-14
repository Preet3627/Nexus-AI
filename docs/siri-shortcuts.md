# Siri Shortcuts & Voice Commands

Nexus-AI exposes real App Intents on macOS 13+ so Siri and Shortcuts can invoke app actions directly.

## Overview

Using **App Intents** (macOS 13+), Nexus-AI provides:

- Voice-activated commands via Siri
- Shortcuts app integration
- A live "Ask Nexus" shortcut that sends the spoken message into Nexus and returns the generated reply for Siri to speak
- Quick launch, web search, file extraction, research-link, and volume actions

## Voice Commands

### AI Queries

> "Hey Siri, ask Nexus to summarize my emails"  
> "Hey Siri, ask Nexus to draft a reply to Sam"  
> "Hey Siri, tell Nexus AI to explain this error"  
> "Hey Siri, ask Nexus to play Hum Pyaar Karne Wale"

**Behavior:**

- Siri launches Nexus-AI if needed
- The spoken text is sent into the normal Nexus chat flow
- Nexus generates a response with the configured provider
- Siri reads the generated response back

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

| Intent                    | Description                                 | Parameters          |
| ------------------------- | ------------------------------------------- | ------------------- |
| `AskNexusIntent`          | Send a message to Nexus and speak the reply | `message`           |
| `PlaySongWithNexusIntent` | Play a song with Nexus                      | `song`, `provider?` |
| `OpenNexusIntent`         | Launch Nexus-AI                             | none                |
| `OpenCometIntent`         | Launch Comet-AI                             | none                |
| `SearchWebIntent`         | Search the web                              | `query`             |
| `ResearchWithCometIntent` | Open a research URL                         | `url`               |
| `ExtractFileIntent`       | Prepare a file extraction request           | `path`              |
| `SetOutputVolumeIntent`   | Adjust macOS output volume                  | `level`             |

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
"Ask Nexus AI to {message}"
"Tell Nexus AI to {message}"
"Ask Nexus AI to play {song}"
```

### Music Playback

```
"Ask Nexus AI to play {song}"
"Play {song} with Nexus AI"
```

The playback provider comes from Nexus settings unless the shortcut explicitly supplies one:

- `YouTube`: launches Comet-AI, opens a YouTube search, and attempts to auto-open the first video.
- `Spotify`: opens Spotify search for the requested song.
- `Apple Music`: opens Apple Music search for the requested song.

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

## Ask Nexus Flow

The `AskNexusIntent` uses a localhost bridge inside the app:

1. Siri runs the App Intent with the spoken `message`
2. The intent POSTs that message to Nexus on `127.0.0.1`
3. The frontend fulfills it through the normal `ask()` chat path
4. The assistant text is returned to the intent
5. Siri speaks the generated response

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
3. Ask Nexus: "What should I focus on first?"
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
