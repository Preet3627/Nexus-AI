use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryItem {
    pub id: String,
    pub content: String,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub name: String,
    pub tone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfilesConfig {
    pub active_profile: String,
    pub profiles: Vec<UserProfile>,
}

impl Default for ProfilesConfig {
    fn default() -> Self {
        Self {
            active_profile: "default".to_string(),
            profiles: vec![
                UserProfile {
                    name: "default".to_string(),
                    tone: "helpful, polite, and descriptive".to_string(),
                },
                UserProfile {
                    name: "serious".to_string(),
                    tone: "formal, extremely direct, concise, and focused on pure facts. No emojis, no fluff.".to_string(),
                },
                UserProfile {
                    name: "funny".to_string(),
                    tone: "humorous, witty, uses jokes, and lighthearted sarcasm.".to_string(),
                },
            ],
        }
    }
}

fn get_memory_file_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("memories.json"))
}

fn get_profiles_file_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("profiles.json"))
}

pub fn load_memories(app_handle: &AppHandle) -> Result<Vec<MemoryItem>, String> {
    let path = get_memory_file_path(app_handle)?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

pub fn save_memories_internal(app_handle: &AppHandle, memories: &[MemoryItem]) -> Result<(), String> {
    let path = get_memory_file_path(app_handle)?;
    let data = serde_json::to_string_pretty(memories).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())
}

pub fn load_profiles(app_handle: &AppHandle) -> Result<ProfilesConfig, String> {
    let path = get_profiles_file_path(app_handle)?;
    if !path.exists() {
        let config = ProfilesConfig::default();
        save_profiles_internal(app_handle, &config)?;
        return Ok(config);
    }
    let data = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

fn save_profiles_internal(app_handle: &AppHandle, config: &ProfilesConfig) -> Result<(), String> {
    let path = get_profiles_file_path(app_handle)?;
    let data = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_user_memory(app_handle: AppHandle, content: String) -> Result<String, String> {
    let mut memories = load_memories(&app_handle)?;
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("Memory content cannot be empty.".to_string());
    }

    // Check for duplicates to prevent memory clutter
    if memories.iter().any(|m| m.content.eq_ignore_ascii_case(trimmed)) {
        return Ok("Memory already stored.".to_string());
    }

    let id = uuid::Uuid::new_v4().to_string();
    let created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    memories.push(MemoryItem {
        id: id.clone(),
        content: trimmed.to_string(),
        created_at,
    });

    save_memories_internal(&app_handle, &memories)?;
    Ok(format!("Successfully remembered: \"{}\"", trimmed))
}

#[tauri::command]
pub fn delete_user_memory(app_handle: AppHandle, id: String) -> Result<(), String> {
    let mut memories = load_memories(&app_handle)?;
    let len_before = memories.len();
    memories.retain(|m| m.id != id);
    if memories.len() == len_before {
        return Err("Memory item not found.".to_string());
    }
    save_memories_internal(&app_handle, &memories)?;
    Ok(())
}

#[tauri::command]
pub fn get_user_memories(app_handle: AppHandle) -> Result<Vec<MemoryItem>, String> {
    load_memories(&app_handle)
}

#[tauri::command]
pub fn edit_user_memory(app_handle: AppHandle, id: String, content: String) -> Result<(), String> {
    let mut memories = load_memories(&app_handle)?;
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("Memory content cannot be empty.".to_string());
    }
    if let Some(mem) = memories.iter_mut().find(|m| m.id == id) {
        mem.content = trimmed.to_string();
    } else {
        return Err("Memory item not found.".to_string());
    }
    save_memories_internal(&app_handle, &memories)?;
    Ok(())
}

#[tauri::command]
pub fn create_user_profile(app_handle: AppHandle, name: String, tone: String) -> Result<(), String> {
    let mut config = load_profiles(&app_handle)?;
    let name_trimmed = name.trim().to_lowercase();
    if name_trimmed.is_empty() {
        return Err("Profile name cannot be empty.".to_string());
    }
    if tone.trim().is_empty() {
        return Err("Tone cannot be empty.".to_string());
    }

    if let Some(p) = config.profiles.iter_mut().find(|p| p.name.to_lowercase() == name_trimmed) {
        p.tone = tone;
    } else {
        config.profiles.push(UserProfile {
            name: name.trim().to_string(),
            tone: tone.trim().to_string(),
        });
    }

    save_profiles_internal(&app_handle, &config)?;
    Ok(())
}

#[tauri::command]
pub fn switch_user_profile(app_handle: AppHandle, name: String) -> Result<String, String> {
    let mut config = load_profiles(&app_handle)?;
    let name_trimmed = name.trim().to_lowercase();
    if !config.profiles.iter().any(|p| p.name.to_lowercase() == name_trimmed) {
        return Err(format!("Profile \"{}\" does not exist.", name));
    }
    config.active_profile = name.trim().to_string();
    save_profiles_internal(&app_handle, &config)?;
    Ok(format!("Switched to profile: \"{}\"", name.trim()))
}

#[tauri::command]
pub fn get_user_profiles(app_handle: AppHandle) -> Result<ProfilesConfig, String> {
    load_profiles(&app_handle)
}

/// RAG: Simple token-matching logic to retrieve relevant long-term memories.
pub fn retrieve_relevant_memories(query: &str, memories: &[MemoryItem]) -> Vec<MemoryItem> {
    let query_words: Vec<String> = query
        .to_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| s.len() > 2)
        .map(|s| s.to_string())
        .collect();

    if query_words.is_empty() {
        return Vec::new();
    }

    let mut scored_memories: Vec<(usize, MemoryItem)> = memories
        .iter()
        .map(|mem| {
            let mem_lower = mem.content.to_lowercase();
            let mut score = 0;
            for word in &query_words {
                if mem_lower.contains(word) {
                    score += 2; // Exact word match
                } else if word.len() > 4 && mem_lower.chars().zip(word.chars()).take(4).all(|(a, b)| a == b) {
                    score += 1; // Prefix match
                }
            }
            (score, mem.clone())
        })
        .filter(|(score, _)| *score > 0)
        .collect();

    scored_memories.sort_by(|a, b| b.0.cmp(&a.0));
    scored_memories.into_iter().map(|(_, mem)| mem).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retrieve_relevant_memories_matching() {
        let memories = vec![
            MemoryItem {
                id: "1".to_string(),
                content: "My birthday is December 5th".to_string(),
                created_at: 0,
            },
            MemoryItem {
                id: "2".to_string(),
                content: "I like extremely short and direct answers".to_string(),
                created_at: 0,
            },
            MemoryItem {
                id: "3".to_string(),
                content: "My dog is named Rex".to_string(),
                created_at: 0,
            },
        ];

        let results = retrieve_relevant_memories("when is my birthday", &memories);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].content, "My birthday is December 5th");

        let results2 = retrieve_relevant_memories("answers should be short", &memories);
        assert_eq!(results2.len(), 1);
        assert_eq!(results2[0].content, "I like extremely short and direct answers");

        let results3 = retrieve_relevant_memories("what is the name of my pet dog", &memories);
        assert_eq!(results3.len(), 1); // Matches "dog" and "named" (via prefix)
        assert_eq!(results3[0].content, "My dog is named Rex");
    }

    #[test]
    fn test_retrieve_relevant_memories_no_match() {
        let memories = vec![
            MemoryItem {
                id: "1".to_string(),
                content: "User likes coffee".to_string(),
                created_at: 0,
            },
        ];
        let results = retrieve_relevant_memories("hello assistant how are you today", &memories);
        assert_eq!(results.len(), 0);
    }
}
