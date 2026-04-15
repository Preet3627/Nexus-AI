use crate::commands::{ChatMessage, ChatResponse};
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct LLMConfig {
    pub url: Option<String>,
    pub api_key: Option<String>,
    pub model: String,
    pub temperature: Option<f32>,
}

impl Default for LLMConfig {
    fn default() -> Self {
        Self {
            url: Some("http://localhost:11434".to_string()),
            api_key: None,
            model: "llama3".to_string(),
            temperature: Some(0.7),
        }
    }
}

#[command]
pub async fn chat(messages: Vec<ChatMessage>, config: Option<LLMConfig>) -> Result<ChatResponse, String> {
    let config = config.unwrap_or_default();
    tracing::info!("Chat request with {} messages", messages.len());

    if let Some(ref url) = config.url {
        if url.contains("localhost:11434") || url.contains("ollama") {
            return ollama_chat(messages, &config).await;
        }
    }

    Ok(ChatResponse {
        content: "No LLM provider configured".to_string(),
    })
}

async fn ollama_chat(messages: Vec<ChatMessage>, config: &LLMConfig) -> Result<ChatResponse, String> {
    let url = format!("{}/api/chat", config.url.as_deref().unwrap_or("http://localhost:11434"));

    let body = serde_json::json!({
        "model": config.model,
        "messages": messages,
        "stream": false
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let content = json["message"]["content"]
        .as_str()
        .unwrap_or("No response")
        .to_string();

    Ok(ChatResponse { content })
}

#[command]
pub async fn stream_chat(
    messages: Vec<ChatMessage>,
    config: Option<LLMConfig>,
) -> Result<(), String> {
    let config = config.unwrap_or_default();
    tracing::info!("Streaming chat request");
    Ok(())
}
