use crate::commands::{ChatMessage, ChatResponse};
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LLMConfigExt {
    pub provider: String,
    pub url: String,
    pub model: String,
    pub api_key: Option<String>,
}

impl Default for LLMConfigExt {
    fn default() -> Self {
        Self {
            provider: "ollama".to_string(),
            url: "http://localhost:11434".to_string(),
            model: "llama3".to_string(),
            api_key: None,
        }
    }
}

#[command]
pub async fn chat(messages: Vec<ChatMessage>, config: Option<LLMConfigExt>) -> Result<ChatResponse, String> {
    let config = config.unwrap_or_default();
    tracing::info!("Chat request with {} messages to {} provider", messages.len(), config.provider);

    match config.provider.as_str() {
        "ollama" => ollama_chat(messages, &config).await,
        "openai" => openai_chat(messages, &config).await,
        "anthropic" => anthropic_chat(messages, &config).await,
        _ => Ok(ChatResponse {
            content: format!("Unknown provider: {}. Supported: ollama, openai, anthropic", config.provider),
        }),
    }
}

async fn ollama_chat(messages: Vec<ChatMessage>, config: &LLMConfigExt) -> Result<ChatResponse, String> {
    let url = format!("{}/api/chat", config.url);

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
        .map_err(|e| format!("Failed to connect to Ollama: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned error: {}", response.status()));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = json["message"]["content"]
        .as_str()
        .unwrap_or("No response from model")
        .to_string();

    Ok(ChatResponse { content })
}

async fn openai_chat(messages: Vec<ChatMessage>, config: &LLMConfigExt) -> Result<ChatResponse, String> {
    let url = format!("{}/chat/completions", config.url);

    let api_key = config.api_key.as_ref().ok_or("OpenAI requires an API key")?;

    let body = serde_json::json!({
        "model": config.model,
        "messages": messages
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to OpenAI: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI error ({}): {}", status, text));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("No response from model")
        .to_string();

    Ok(ChatResponse { content })
}

async fn anthropic_chat(messages: Vec<ChatMessage>, config: &LLMConfigExt) -> Result<ChatResponse, String> {
    let url = format!("{}/messages", config.url);

    let api_key = config.api_key.as_ref().ok_or("Anthropic requires an API key")?;

    let last_message = messages.last().map(|m| m.content.clone()).unwrap_or_default();

    let body = serde_json::json!({
        "model": config.model,
        "max_tokens": 1024,
        "messages": [{"role": "user", "content": last_message}]
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Anthropic: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Anthropic error ({}): {}", status, text));
    }

    let json: serde_json::Value = response.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;

    let content = json["content"][0]["text"]
        .as_str()
        .unwrap_or("No response from model")
        .to_string();

    Ok(ChatResponse { content })
}

#[command]
pub async fn stream_chat(
    _messages: Vec<ChatMessage>,
    _config: Option<LLMConfigExt>,
) -> Result<(), String> {
    tracing::info!("Stream chat not fully implemented yet");
    Ok(())
}
