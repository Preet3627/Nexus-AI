use chrono::{DateTime, Datelike, FixedOffset, Timelike};
use std::process::Command;

fn escape_applescript(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}

fn month_name(month: u32) -> &'static str {
    match month {
        1 => "January",
        2 => "February",
        3 => "March",
        4 => "April",
        5 => "May",
        6 => "June",
        7 => "July",
        8 => "August",
        9 => "September",
        10 => "October",
        11 => "November",
        12 => "December",
        _ => "January",
    }
}

fn applescript_date(name: &str, value: &DateTime<FixedOffset>) -> String {
    format!(
        "set {name} to current date\n\
         set year of {name} to {}\n\
         set month of {name} to {}\n\
         set day of {name} to {}\n\
         set time of {name} to ({} * hours) + ({} * minutes) + {}",
        value.year(),
        month_name(value.month()),
        value.day(),
        value.hour(),
        value.minute(),
        value.second()
    )
}

fn run_osascript(script: &str) -> Result<String, String> {
    let output = Command::new("osascript")
        .args(["-e", script])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn list_calendar_events(days_ahead: Option<u16>, limit: Option<u16>) -> Result<String, String> {
    let days = days_ahead.unwrap_or(7).max(1);
    let max_items = limit.unwrap_or(8).max(1);

    let script = format!(
        r#"
set nowDate to current date
set endDate to nowDate + ({days} * days)
set outputLines to {{}}
set itemCount to 0
tell application "Calendar"
    repeat with cal in calendars
        try
            set matchingEvents to (every event of cal whose start date is greater than or equal to nowDate and start date is less than or equal to endDate)
            repeat with ev in matchingEvents
                set eventLine to ((summary of ev as string) & " | " & (name of cal as string) & " | " & (start date of ev as string) & " -> " & (end date of ev as string))
                set end of outputLines to eventLine
                set itemCount to itemCount + 1
                if itemCount is greater than or equal to {max_items} then
                    set AppleScript's text item delimiters to linefeed
                    return outputLines as string
                end if
            end repeat
        end try
    end repeat
end tell
if (count of outputLines) is 0 then
    return "No calendar events found in the next {days} day(s)."
end if
set AppleScript's text item delimiters to linefeed
return outputLines as string
"#
    );

    run_osascript(&script)
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn list_calendar_events(
    _days_ahead: Option<u16>,
    _limit: Option<u16>,
) -> Result<String, String> {
    Err("Calendar access is only available on macOS.".to_string())
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn create_calendar_event(
    title: String,
    start_iso: String,
    end_iso: String,
    notes: Option<String>,
) -> Result<String, String> {
    let title = title.trim();
    if title.is_empty() {
        return Err("Calendar event title cannot be empty.".to_string());
    }

    let start = DateTime::parse_from_rfc3339(start_iso.trim())
        .map_err(|e| format!("Invalid start date: {e}"))?;
    let end = DateTime::parse_from_rfc3339(end_iso.trim())
        .map_err(|e| format!("Invalid end date: {e}"))?;
    let notes = notes.unwrap_or_default();

    let script = format!(
        r#"
{}
{}
tell application "Calendar"
    if not (exists default calendar) then error "Calendar could not find a default calendar."
    tell default calendar
        make new event with properties {{summary:"{}", start date:startDate, end date:endDate, description:"{}"}}
    end tell
end tell
return "Created calendar event: {}"
"#,
        applescript_date("startDate", &start),
        applescript_date("endDate", &end),
        escape_applescript(title),
        escape_applescript(&notes),
        escape_applescript(title)
    );

    run_osascript(&script)
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn create_calendar_event(
    _title: String,
    _start_iso: String,
    _end_iso: String,
    _notes: Option<String>,
) -> Result<String, String> {
    Err("Calendar access is only available on macOS.".to_string())
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub fn create_alarm_reminder(
    title: String,
    due_iso: String,
    notes: Option<String>,
) -> Result<String, String> {
    let title = title.trim();
    if title.is_empty() {
        return Err("Reminder title cannot be empty.".to_string());
    }

    let due = DateTime::parse_from_rfc3339(due_iso.trim())
        .map_err(|e| format!("Invalid due date: {e}"))?;
    let notes = notes.unwrap_or_default();

    let script = format!(
        r#"
{}
tell application "Reminders"
    if not (exists default list) then error "Reminders could not find a default list."
    tell default list
        make new reminder with properties {{name:"{}", body:"{}", remind me date:dueDate}}
    end tell
end tell
return "Created reminder alarm: {}"
"#,
        applescript_date("dueDate", &due),
        escape_applescript(title),
        escape_applescript(&notes),
        escape_applescript(title)
    );

    run_osascript(&script)
}

#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub fn create_alarm_reminder(
    _title: String,
    _due_iso: String,
    _notes: Option<String>,
) -> Result<String, String> {
    Err("Reminders access is only available on macOS.".to_string())
}
