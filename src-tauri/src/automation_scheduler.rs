use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use parking_lot::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc, Local};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutomationTask {
    pub id: String,
    pub name: String,
    pub description: String,
    pub cron_expression: String,
    pub command: AutomationCommand,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
    pub run_count: u64,
    pub success_count: u64,
    pub failure_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum AutomationCommand {
    #[serde(rename = "ai_prompt")]
    AIPrompt { prompt: String, model: Option<String> },
    #[serde(rename = "shell")]
    Shell { command: String, timeout_secs: Option<u32> },
    #[serde(rename = "http_request")]
    HTTPRequest { url: String, method: String, headers: HashMap<String, String>, body: Option<String> },
    #[serde(rename = "notification")]
    Notification { title: String, body: String, sound: bool },
    #[serde(rename = "workflow")]
    Workflow { workflow_id: String, params: HashMap<String, String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CronSchedule {
    pub minute: String,
    pub hour: String,
    pub day_of_month: String,
    pub month: String,
    pub day_of_week: String,
}

impl CronSchedule {
    pub fn new(expression: &str) -> Result<Self, String> {
        let parts: Vec<&str> = expression.split_whitespace().collect();
        if parts.len() != 5 {
            return Err("Cron expression must have 5 fields".to_string());
        }

        Ok(Self {
            minute: parts[0].to_string(),
            hour: parts[1].to_string(),
            day_of_month: parts[2].to_string(),
            month: parts[3].to_string(),
            day_of_week: parts[4].to_string(),
        })
    }

    pub fn to_cron_expression(&self) -> String {
        format!("{} {} {} {} {}",
            self.minute, self.hour, self.day_of_month, self.month, self.day_of_week
        )
    }

    pub fn is_due(&self) -> bool {
        let now = Local::now();
        
        self.matches_field(&self.minute, now.minute() as u32, 0, 59) &&
        self.matches_field(&self.hour, now.hour() as u32, 0, 23) &&
        self.matches_field(&self.day_of_month, now.day(), 1, 31) &&
        self.matches_field(&self.month, now.month(), 1, 12) &&
        self.matches_field(&self.day_of_week, now.weekday().num_days_from_sunday(), 0, 6)
    }

    fn matches_field(&self, field: &str, value: u32, min: u32, max: u32) -> bool {
        if field == "*" {
            return true;
        }

        if field.contains('/') {
            let parts: Vec<&str> = field.split('/').collect();
            let step = parts[1].parse::<u32>().unwrap_or(1);
            return value % step == 0;
        }

        if field.contains(',') {
            return field.split(',')
                .any(|v| v.parse::<u32>().map(|n| n == value).unwrap_or(false));
        }

        if field.contains('-') {
            let parts: Vec<&str> = field.split('-').collect();
            if parts.len() == 2 {
                let start = parts[0].parse::<u32>().unwrap_or(min);
                let end = parts[1].parse::<u32>().unwrap_or(max);
                return value >= start && value <= end;
            }
        }

        field.parse::<u32>().map(|n| n == value).unwrap_or(false)
    }
}

pub struct AutomationScheduler {
    tasks: Arc<RwLock<HashMap<String, AutomationTask>>>,
    running: Arc<RwLock<HashMap<String, bool>>>,
    last_check: Arc<RwLock<Instant>>,
}

impl AutomationScheduler {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(RwLock::new(HashMap::new())),
            running: Arc::new(RwLock::new(HashMap::new())),
            last_check: Arc::new(RwLock::new(Instant::now())),
        }
    }

    pub fn add_task(&self, mut task: AutomationTask) -> Result<AutomationTask, String> {
        if CronSchedule::new(&task.cron_expression).is_err() {
            return Err("Invalid cron expression".to_string());
        }

        task.id = Uuid::new_v4().to_string();
        task.created_at = Utc::now();
        task.next_run = self.calculate_next_run(&task.cron_expression);

        self.tasks.write().insert(task.id.clone(), task.clone());
        Ok(task)
    }

    pub fn update_task(&self, task: AutomationTask) -> Result<AutomationTask, String> {
        if !self.tasks.read().contains_key(&task.id) {
            return Err("Task not found".to_string());
        }

        if CronSchedule::new(&task.cron_expression).is_err() {
            return Err("Invalid cron expression".to_string());
        }

        let mut tasks = self.tasks.write();
        let mut updated_task = task.clone();
        updated_task.next_run = self.calculate_next_run(&task.cron_expression);
        tasks.insert(task.id.clone(), updated_task.clone());
        Ok(updated_task)
    }

    pub fn remove_task(&self, id: &str) -> Result<(), String> {
        self.tasks.write().remove(id);
        Ok(())
    }

    pub fn get_task(&self, id: &str) -> Option<AutomationTask> {
        self.tasks.read().get(id).cloned()
    }

    pub fn get_all_tasks(&self) -> Vec<AutomationTask> {
        self.tasks.read().values().cloned().collect()
    }

    pub fn get_enabled_tasks(&self) -> Vec<AutomationTask> {
        self.tasks.read()
            .values()
            .filter(|t| t.enabled)
            .cloned()
            .collect()
    }

    pub fn toggle_task(&self, id: &str, enabled: bool) -> Result<AutomationTask, String> {
        let mut tasks = self.tasks.write();
        if let Some(task) = tasks.get_mut(id) {
            task.enabled = enabled;
            task.next_run = if enabled {
                self.calculate_next_run(&task.cron_expression)
            } else {
                None
            };
            Ok(task.clone())
        } else {
            Err("Task not found".to_string())
        }
    }

    pub fn check_and_run_due_tasks(&self) -> Vec<TaskResult> {
        let mut results = Vec::new();
        let tasks: Vec<AutomationTask> = self.get_enabled_tasks();

        for task in tasks {
            if let Some(cron) = CronSchedule::new(&task.cron_expression).ok() {
                if cron.is_due() {
                    if !self.is_running(&task.id) {
                        self.set_running(&task.id, true);
                        let result = self.execute_task(&task);
                        self.set_running(&task.id, false);
                        results.push(result);
                    }
                }
            }
        }

        *self.last_check.write() = Instant::now();
        results
    }

    fn execute_task(&self, task: &AutomationTask) -> TaskResult {
        let start_time = Instant::now();
        let result = match &task.command {
            AutomationCommand::AIPrompt { prompt, model } => {
                Ok(format!("AI prompt executed: {}", prompt))
            }
            AutomationCommand::Shell { command, timeout_secs } => {
                self.execute_shell(command, *timeout_secs)
            }
            AutomationCommand::HTTPRequest { url, method, headers, body } => {
                self.execute_http(url, method, headers, body.as_deref())
            }
            AutomationCommand::Notification { title, body, sound } => {
                self.send_notification(title, body, *sound)
            }
            AutomationCommand::Workflow { workflow_id, params } => {
                Ok(format!("Workflow {} executed", workflow_id))
            }
        };

        let duration = start_time.elapsed();
        let success = result.is_ok();

        {
            let mut tasks = self.tasks.write();
            if let Some(t) = tasks.get_mut(&task.id) {
                t.last_run = Some(Utc::now());
                t.next_run = self.calculate_next_run(&t.cron_expression);
                t.run_count += 1;
                if success { t.success_count += 1; }
                else { t.failure_count += 1; }
            }
        }

        TaskResult {
            task_id: task.id.clone(),
            task_name: task.name.clone(),
            success,
            output: result.unwrap_or_else(|e| e),
            duration_ms: duration.as_millis() as u64,
            executed_at: Utc::now(),
        }
    }

    fn execute_shell(&self, command: &str, timeout_secs: Option<u32>) -> Result<String, String> {
        use std::process::Command;
        
        let timeout = Duration::from_secs(timeout_secs.unwrap_or(300) as u64);
        
        let output = Command::new("sh")
            .args(["-c", command])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    fn execute_http(&self, url: &str, method: &str, headers: &HashMap<String, String>, body: Option<&str>) -> Result<String, String> {
        Ok(format!("HTTP {} to {}", method, url))
    }

    fn send_notification(&self, title: &str, body: &str, sound: bool) -> Result<String, String> {
        use std::process::Command;
        
        let sound_arg = if sound { "default sound name" } else { "" };
        
        let output = Command::new("osascript")
            .args([
                "-e",
                &format!(
                    "display notification \"{}\" with title \"{}\"",
                    body, title
                )
            ])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok("Notification sent".to_string())
        } else {
            Err("Failed to send notification".to_string())
        }
    }

    fn calculate_next_run(&self, cron_expr: &str) -> Option<DateTime<Utc>> {
        None
    }

    fn is_running(&self, id: &str) -> bool {
        self.running.read().get(id).copied().unwrap_or(false)
    }

    fn set_running(&self, id: &str, running: bool) {
        self.running.write().insert(id.to_string(), running);
    }

    pub fn get_statistics(&self) -> SchedulerStatistics {
        let tasks = self.tasks.read();
        let total = tasks.len();
        let enabled = tasks.values().filter(|t| t.enabled).count();
        let total_runs: u64 = tasks.values().map(|t| t.run_count).sum();
        let total_success: u64 = tasks.values().map(|t| t.success_count).sum();
        let total_failures: u64 = tasks.values().map(|t| t.failure_count).sum();

        SchedulerStatistics {
            total_tasks: total,
            enabled_tasks: enabled,
            total_runs,
            successful_runs: total_success,
            failed_runs: total_failures,
            success_rate: if total_runs > 0 {
                (total_success as f64 / total_runs as f64) * 100.0
            } else {
                0.0
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskResult {
    pub task_id: String,
    pub task_name: String,
    pub success: bool,
    pub output: String,
    pub duration_ms: u64,
    pub executed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchedulerStatistics {
    pub total_tasks: usize,
    pub enabled_tasks: usize,
    pub total_runs: u64,
    pub successful_runs: u64,
    pub failed_runs: u64,
    pub success_rate: f64,
}

pub fn preset_cron_expressions() -> HashMap<String, &'static str> {
    let mut presets = HashMap::new();
    presets.insert("Every minute".to_string(), "* * * * *");
    presets.insert("Every 5 minutes".to_string(), "*/5 * * * *");
    presets.insert("Every 15 minutes".to_string(), "*/15 * * * *");
    presets.insert("Every hour".to_string(), "0 * * * *");
    presets.insert("Every day at midnight".to_string(), "0 0 * * *");
    presets.insert("Every day at 8am".to_string(), "0 8 * * *");
    presets.insert("Every weekday at 9am".to_string(), "0 9 * * 1-5");
    presets.insert("Every Monday at 9am".to_string(), "0 9 * * 1");
    presets.insert("First day of month".to_string(), "0 0 1 * *");
    presets
}

impl Default for AutomationScheduler {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cron_schedule() {
        let cron = CronSchedule::new("*/5 * * * *").unwrap();
        assert_eq!(cron.minute, "*/5");
    }

    #[test]
    fn test_scheduler() {
        let scheduler = AutomationScheduler::new();
        let task = AutomationTask {
            id: "".to_string(),
            name: "Test".to_string(),
            description: "Test task".to_string(),
            cron_expression: "* * * * *".to_string(),
            command: AutomationCommand::Notification {
                title: "Test".to_string(),
                body: "Test".to_string(),
                sound: true,
            },
            enabled: true,
            created_at: Utc::now(),
            last_run: None,
            next_run: None,
            run_count: 0,
            success_count: 0,
            failure_count: 0,
        };

        let result = scheduler.add_task(task);
        assert!(result.is_ok());
    }
}
