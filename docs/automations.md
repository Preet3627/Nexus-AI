# Automations

Nexus-AI includes a powerful automation system that allows you to schedule tasks, run AI prompts on a schedule, execute shell commands, send notifications, and more.

## Overview

The automation system is built on:
- **Cron Scheduler**: Industry-standard cron expressions for flexible scheduling
- **LaunchDaemon**: System-level background service (runs even when no user is logged in)
- **LaunchAgent**: User-level background service (runs when user is logged in)

## Cron Expressions

Nexus-AI uses standard 5-field cron expressions:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of week (0-6, Sunday=0)
│ │ │ │ │
* * * * *
```

### Preset Schedules

| Preset | Expression | Description |
|--------|-----------|-------------|
| Every minute | `* * * * *` | Runs every minute |
| Every 5 minutes | `*/5 * * * *` | Runs every 5 minutes |
| Every 15 minutes | `*/15 * * * *` | Runs every 15 minutes |
| Every hour | `0 * * * *` | Runs at the start of every hour |
| Daily midnight | `0 0 * * *` | Runs at 00:00 every day |
| Daily 8am | `0 8 * * *` | Runs at 08:00 every day |
| Weekdays 9am | `0 9 * * 1-5` | Runs at 09:00 Monday-Friday |
| Weekly Monday | `0 9 * * 1` | Runs at 09:00 every Monday |
| Monthly 1st | `0 0 1 * *` | Runs at 00:00 on the 1st of every month |

### Custom Examples

| Expression | Description |
|-----------|-------------|
| `*/30 * * * *` | Every 30 minutes |
| `0 */2 * * *` | Every 2 hours |
| `30 9 * * 1-5` | 9:30 AM on weekdays |
| `0 8,12,18 * * *` | 8 AM, noon, and 6 PM daily |
| `0 0 * * 0` | Midnight every Sunday |
| `0 0 1,15 * *` | Midnight on the 1st and 15th |

## Command Types

### AI Prompt

Run an AI prompt on a schedule:

```json
{
  "type": "ai_prompt",
  "prompt": "Generate a summary of today's top news",
  "model": "gpt-4" // optional
}
```

**Example Use Cases:**
- Morning brief at 8am
- Daily summary at 6pm
- Weekly report every Monday

### Shell Command

Execute shell commands:

```json
{
  "type": "shell",
  "command": "say 'Time to take a break!'",
  "timeout_secs": 30
}
```

**Example Use Cases:**
- System maintenance scripts
- Backup commands
- File organization

### HTTP Request

Make HTTP requests:

```json
{
  "type": "http_request",
  "url": "https://api.example.com/webhook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token123"
  },
  "body": "{\"event\": \"scheduled\"}"
}
```

### Notification

Send macOS notifications:

```json
{
  "type": "notification",
  "title": "Nexus-AI Reminder",
  "body": "Time to review your daily tasks",
  "sound": true
}
```

### Workflow

Execute predefined workflows:

```json
{
  "type": "workflow",
  "workflow_id": "daily-backup",
  "params": {
    "target": "server-1"
  }
}
```

## LaunchDaemon vs LaunchAgent

### LaunchDaemon (`/Library/LaunchDaemons/`)

- Runs as **root** (system-level)
- Starts at **boot time**
- Runs even when **no user is logged in**
- Requires **admin privileges** to install
- Best for: System-wide tasks, server-like operations

### LaunchAgent (`~/Library/LaunchAgents/`)

- Runs as the **logged-in user**
- Starts when **user logs in**
- User's session is available
- Installs without admin privileges
- Best for: User-specific tasks, GUI operations

## Installation

### User-Level (LaunchAgent)

```bash
# Enable from menu bar
Nexus-AI → Launch at Login ✓

# Or via command line
./install-launch-agent.sh
```

### System-Level (LaunchDaemon)

Requires admin privileges:

```bash
sudo ./install-launch-daemon.sh
```

## Management

### View Status

```bash
# Check if daemon is running
launchctl list | grep nexus

# View logs
tail -f /tmp/nexus-ai-daemon.log
```

### Stop/Start

```bash
# Stop
launchctl stop ai.nexus.NexusAI.Bridge

# Start
launchctl start ai.nexus.NexusAI.Bridge
```

### Uninstall

```bash
# User-level
./uninstall-launch-agent.sh

# System-level (requires sudo)
sudo ./uninstall-launch-daemon.sh
```

## Security Considerations

1. **Shell Commands**: Only run trusted commands
2. **API Keys**: Store in Keychain, not in task configs
3. **Permissions**: Required permissions:
   - Accessibility (for global hotkey)
   - Screen Recording (for screenshots)
   - Automation (for Siri shortcuts)

## Troubleshooting

### Task Not Running

1. Check if automation is enabled
2. Verify cron expression is valid
3. Check logs: `/tmp/nexus-ai-daemon.log`
4. Ensure daemon is running: `launchctl list | grep nexus`

### Permission Denied

1. Check Accessibility permissions in System Settings
2. Grant Full Disk Access if needed
3. For LaunchDaemon, ensure proper file permissions

### High CPU/Memory

1. Reduce task frequency
2. Increase timeout values
3. Check for runaway scripts

## Best Practices

1. **Start Simple**: Test with "Every minute" before complex schedules
2. **Logging**: Use notifications to confirm task completion
3. **Error Handling**: Set reasonable timeouts
4. **Security**: Never store secrets in plain text
5. **Monitoring**: Review task statistics regularly
