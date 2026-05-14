use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use chrono::Utc;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::{settings, shared_keychain};

const LOOPBACK_HOST: &str = "127.0.0.1";
const CALLBACK_PATH: &str = "/auth/callback";
const DEFAULT_BRIDGE_URL: &str = "https://browser.ponsrischool.in";
const DEFAULT_BRIDGE_TOKEN: &str = "comet-secure-v1";
const LOOPBACK_TIMEOUT_SECONDS: u64 = 180;
const BRIDGE_IDENTITY_CLIENT_ID: &str = "nexus-ai-native";

const DEFAULT_IDENTITY_SCOPES: &[&str] = &["openid", "email", "profile"];
const DEFAULT_WORKSPACE_SCOPES: &[&str] = &[
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
];

#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleAuthStatus {
    pub identity_connected: bool,
    pub workspace_connected: bool,
    pub email: Option<String>,
    pub workspace_scopes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailListItem {
    pub id: String,
    pub thread_id: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub subject: Option<String>,
    pub snippet: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GmailMessage {
    pub id: String,
    pub thread_id: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub subject: Option<String>,
    pub snippet: Option<String>,
    pub date: Option<String>,
    pub body_text: Option<String>,
    pub body_html: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DriveFileItem {
    pub id: String,
    pub name: String,
    pub mime_type: Option<String>,
    pub modified_time: Option<String>,
    pub owner: Option<String>,
    pub web_view_link: Option<String>,
}

#[derive(Debug, Deserialize)]
struct BridgeConfig {
    #[serde(rename = "googleClientId")]
    google_client_id: Option<String>,
    #[serde(rename = "firebaseConfig")]
    firebase_config: Option<BridgeFirebaseConfig>,
}

#[derive(Debug, Deserialize, Clone)]
struct BridgeFirebaseConfig {
    #[serde(rename = "apiKey")]
    api_key: Option<String>,
    #[serde(rename = "authDomain")]
    auth_domain: Option<String>,
    #[serde(rename = "projectId")]
    project_id: Option<String>,
    #[serde(rename = "storageBucket")]
    storage_bucket: Option<String>,
    #[serde(rename = "messagingSenderId")]
    messaging_sender_id: Option<String>,
    #[serde(rename = "appId")]
    app_id: Option<String>,
    measurement_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GoogleRefreshResponse {
    access_token: String,
    expires_in: i64,
    id_token: Option<String>,
    scope: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum GoogleSessionKind {
    Identity,
    Workspace,
}

impl GoogleSessionKind {
    fn namespace(self) -> shared_keychain::KeychainNamespace {
        match self {
            Self::Identity => shared_keychain::KeychainNamespace::Identity,
            Self::Workspace => shared_keychain::KeychainNamespace::Workspace,
        }
    }

    fn default_scopes(self) -> Vec<String> {
        match self {
            Self::Identity => DEFAULT_IDENTITY_SCOPES
                .iter()
                .map(|scope| (*scope).to_string())
                .collect(),
            Self::Workspace => DEFAULT_WORKSPACE_SCOPES
                .iter()
                .map(|scope| (*scope).to_string())
                .collect(),
        }
    }
}

fn bridge_base_url(app_settings: &settings::AppSettings) -> String {
    let raw = app_settings.auth_bridge_base_url.trim();
    if raw.is_empty() {
        DEFAULT_BRIDGE_URL.to_string()
    } else {
        raw.trim_end_matches('/').to_string()
    }
}

fn bridge_token(app_settings: &settings::AppSettings) -> String {
    app_settings
        .auth_bridge_app_token
        .clone()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_BRIDGE_TOKEN.to_string())
}

fn access_group(app_settings: &settings::AppSettings) -> Option<&str> {
    app_settings
        .shared_keychain_access_group
        .as_deref()
        .filter(|value| !value.trim().is_empty())
}

fn normalize_scopes(scopes: Option<Vec<String>>, kind: GoogleSessionKind) -> Vec<String> {
    let mut ordered = Vec::new();

    for scope in scopes.unwrap_or_else(|| kind.default_scopes()) {
        let trimmed = scope.trim();
        if trimmed.is_empty() {
            continue;
        }
        let value = trimmed.to_string();
        if !ordered.contains(&value) {
            ordered.push(value);
        }
    }

    if ordered.is_empty() {
        kind.default_scopes()
    } else {
        ordered
    }
}

async fn fetch_bridge_config(app_settings: &settings::AppSettings) -> Result<BridgeConfig, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/config", bridge_base_url(app_settings)))
        .header("X-Comet-App-Token", bridge_token(app_settings))
        .send()
        .await
        .map_err(|error| format!("Failed to reach the landing-page auth bridge: {error}"))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Auth bridge config request failed: {body}"));
    }

    response
        .json::<BridgeConfig>()
        .await
        .map_err(|error| format!("Failed to parse auth bridge config: {error}"))
}

fn write_html_response(stream: &mut TcpStream, success: bool) {
    let title = if success {
        "Nexus AI Sign-In Complete"
    } else {
        "Nexus AI Sign-In Failed"
    };
    let message = if success {
        "You can close this tab and return to Nexus AI."
    } else {
        "Something went wrong. Return to Nexus AI to try again."
    };
    let body = format!(
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>{title}</title></head><body style=\"font-family:-apple-system,system-ui;padding:32px;background:#0b0d10;color:#f5f7fb\"><h1>{title}</h1><p>{message}</p></body></html>"
    );
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.len(),
        body
    );
    let _ = stream.write_all(response.as_bytes());
    let _ = stream.flush();
}

fn wait_for_loopback_query(
    listener: TcpListener,
    timeout: Duration,
) -> Result<HashMap<String, String>, String> {
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let deadline = Instant::now() + timeout;

    loop {
        match listener.accept() {
            Ok((mut stream, _)) => {
                let mut buffer = [0u8; 8192];
                let read = stream
                    .read(&mut buffer)
                    .map_err(|error| error.to_string())?;
                let request = String::from_utf8_lossy(&buffer[..read]);
                let first_line = request.lines().next().unwrap_or_default();
                let path = first_line
                    .split_whitespace()
                    .nth(1)
                    .ok_or_else(|| "OAuth callback request was malformed.".to_string())?;
                let parsed = reqwest::Url::parse(&format!("http://{}{}", LOOPBACK_HOST, path))
                    .map_err(|error| error.to_string())?;
                let params = parsed
                    .query_pairs()
                    .map(|(key, value)| (key.to_string(), value.to_string()))
                    .collect::<HashMap<_, _>>();

                let success = parsed.path() == CALLBACK_PATH
                    && params
                        .get("auth_status")
                        .map(|value| value == "success")
                        .unwrap_or(true)
                    && !params.contains_key("error");
                write_html_response(&mut stream, success);

                if parsed.path() == CALLBACK_PATH {
                    return Ok(params);
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                if Instant::now() >= deadline {
                    return Err("Timed out waiting for the Google sign-in callback.".to_string());
                }
                std::thread::sleep(Duration::from_millis(120));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}

fn build_session(
    params: &HashMap<String, String>,
    requested_scopes: &[String],
    source: &str,
) -> shared_keychain::GoogleAuthSession {
    let scopes = params
        .get("scope")
        .map(|value| {
            value
                .split_whitespace()
                .filter(|item| !item.trim().is_empty())
                .map(|item| item.to_string())
                .collect::<Vec<_>>()
        })
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| requested_scopes.to_vec());

    let expires_at = params
        .get("expires_in")
        .and_then(|value| value.parse::<i64>().ok())
        .map(|seconds| Utc::now().timestamp() + seconds.saturating_sub(60));

    shared_keychain::GoogleAuthSession {
        uid: params
            .get("uid")
            .cloned()
            .or_else(|| params.get("user_id").cloned()),
        email: params.get("email").cloned(),
        name: params.get("name").cloned(),
        photo: params.get("photo").cloned(),
        access_token: params
            .get("token")
            .cloned()
            .or_else(|| params.get("access_token").cloned()),
        refresh_token: params.get("refresh_token").cloned(),
        id_token: params.get("id_token").cloned(),
        expires_at,
        scopes,
        firebase_config: params.get("firebase_config").cloned(),
        source: Some(source.to_string()),
    }
}

async fn start_bridge_sign_in(
    app_handle: &AppHandle,
    app_settings: &settings::AppSettings,
    kind: GoogleSessionKind,
    scopes: Option<Vec<String>>,
) -> Result<shared_keychain::GoogleAuthSession, String> {
    let bridge_config = fetch_bridge_config(app_settings).await?;
    if bridge_config
        .google_client_id
        .as_deref()
        .unwrap_or("")
        .trim()
        .is_empty()
    {
        return Err("The landing-page auth bridge is missing a Google client ID.".to_string());
    }

    let requested_scopes = normalize_scopes(scopes, kind);
    let listener = TcpListener::bind((LOOPBACK_HOST, 0)).map_err(|error| error.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let redirect_uri = format!("http://{}:{}{}", LOOPBACK_HOST, port, CALLBACK_PATH);

    let start_path = match kind {
        GoogleSessionKind::Identity => "/auth",
        GoogleSessionKind::Workspace => "/api/auth/google",
    };
    let mut start_url =
        reqwest::Url::parse(&format!("{}{}", bridge_base_url(app_settings), start_path))
            .map_err(|error| error.to_string())?;

    match kind {
        GoogleSessionKind::Identity => {
            start_url
                .query_pairs_mut()
                .append_pair("client_id", BRIDGE_IDENTITY_CLIENT_ID)
                .append_pair("redirect_uri", &redirect_uri);
        }
        GoogleSessionKind::Workspace => {
            start_url
                .query_pairs_mut()
                .append_pair("redirect_uri", &redirect_uri)
                .append_pair("scopes", &requested_scopes.join(" "));
        }
    }

    if let Some(fb_config) = bridge_config.firebase_config.clone() {
        if fb_config.api_key.as_deref().unwrap_or("").trim().len() > 10 {
            let param = serde_json::json!({
                "apiKey": fb_config.api_key,
                "authDomain": fb_config.auth_domain,
                "projectId": fb_config.project_id,
                "storageBucket": fb_config.storage_bucket,
                "messagingSenderId": fb_config.messaging_sender_id,
                "appId": fb_config.app_id,
                "measurementId": fb_config.measurement_id,
            });
            let encoded = URL_SAFE_NO_PAD.encode(param.to_string());
            start_url
                .query_pairs_mut()
                .append_pair("firebase_config", &encoded);
        }
    }

    crate::native_actions::open_target(start_url.to_string())?;

    let params = tauri::async_runtime::spawn_blocking(move || {
        wait_for_loopback_query(listener, Duration::from_secs(LOOPBACK_TIMEOUT_SECONDS))
    })
    .await
    .map_err(|error| error.to_string())??;

    if params.contains_key("error")
        || params
            .get("auth_status")
            .map(|value| value != "success")
            .unwrap_or(false)
    {
        return Err(params
            .get("error")
            .cloned()
            .unwrap_or_else(|| "Google sign-in did not complete successfully.".to_string()));
    }

    let session = build_session(&params, &requested_scopes, "landing-page-bridge");
    shared_keychain::save_session(
        app_handle,
        kind.namespace(),
        &session,
        access_group(app_settings),
    )?;

    if matches!(kind, GoogleSessionKind::Workspace) {
        shared_keychain::save_session(
            app_handle,
            shared_keychain::KeychainNamespace::Identity,
            &session,
            access_group(app_settings),
        )?;
    }

    Ok(session)
}

fn workspace_scope_enabled(scopes: &[String], prefix: &str) -> bool {
    scopes.iter().any(|scope| scope.starts_with(prefix))
}

fn persist_workspace_capabilities(
    db: &State<'_, crate::history::Database>,
    session: &shared_keychain::GoogleAuthSession,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    let mut app_settings = settings::load_from_connection(&conn)?;
    app_settings.gmail_enabled =
        workspace_scope_enabled(&session.scopes, "https://www.googleapis.com/auth/gmail");
    app_settings.drive_enabled =
        workspace_scope_enabled(&session.scopes, "https://www.googleapis.com/auth/drive");
    settings::save_to_connection(&conn, &app_settings)
}

async fn load_workspace_session(
    app_handle: &AppHandle,
    app_settings: &settings::AppSettings,
) -> Result<shared_keychain::GoogleAuthSession, String> {
    shared_keychain::load_session(
        app_handle,
        shared_keychain::KeychainNamespace::Workspace,
        access_group(app_settings),
    )?
    .ok_or_else(|| {
        "Google Workspace is not connected yet. Run /signin workspace first.".to_string()
    })
}

async fn refresh_workspace_session_if_needed(
    app_handle: &AppHandle,
    app_settings: &settings::AppSettings,
) -> Result<shared_keychain::GoogleAuthSession, String> {
    let mut session = load_workspace_session(app_handle, app_settings).await?;
    let now = Utc::now().timestamp();
    let expired = session
        .expires_at
        .map(|value| value <= now)
        .unwrap_or(false);

    if !expired {
        return Ok(session);
    }

    let refresh_token = session.refresh_token.clone().ok_or_else(|| {
        "Google Workspace session has no refresh token. Reconnect the account.".to_string()
    })?;

    let client = reqwest::Client::new();
    let response = client
        .post(format!(
            "{}/api/auth/refresh",
            bridge_base_url(app_settings)
        ))
        .header("X-Comet-App-Token", bridge_token(app_settings))
        .header(CONTENT_TYPE, "application/json")
        .json(&serde_json::json!({ "refresh_token": refresh_token }))
        .send()
        .await
        .map_err(|error| format!("Failed to refresh the Google Workspace token: {error}"))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Google token refresh failed: {body}"));
    }

    let refreshed = response
        .json::<GoogleRefreshResponse>()
        .await
        .map_err(|error| format!("Failed to parse the refresh response: {error}"))?;

    session.access_token = Some(refreshed.access_token);
    session.id_token = refreshed.id_token.or(session.id_token);
    session.expires_at = Some(Utc::now().timestamp() + refreshed.expires_in.saturating_sub(60));
    if let Some(scope) = refreshed.scope {
        session.scopes = scope
            .split_whitespace()
            .filter(|item| !item.trim().is_empty())
            .map(|item| item.to_string())
            .collect();
    }

    shared_keychain::save_session(
        app_handle,
        shared_keychain::KeychainNamespace::Workspace,
        &session,
        access_group(app_settings),
    )?;
    shared_keychain::save_session(
        app_handle,
        shared_keychain::KeychainNamespace::Identity,
        &session,
        access_group(app_settings),
    )?;

    Ok(session)
}

fn gmail_header(headers: &[serde_json::Value], name: &str) -> Option<String> {
    headers.iter().find_map(|header| {
        let header_name = header.get("name")?.as_str()?;
        if header_name.eq_ignore_ascii_case(name) {
            header.get("value")?.as_str().map(|value| value.to_string())
        } else {
            None
        }
    })
}

fn decode_gmail_body(part: &serde_json::Value, mime_type: &str) -> Option<String> {
    if part.get("mimeType")?.as_str()? == mime_type {
        let data = part.get("body")?.get("data")?.as_str()?;
        let bytes = URL_SAFE_NO_PAD.decode(data).ok()?;
        return String::from_utf8(bytes).ok();
    }

    part.get("parts")?
        .as_array()?
        .iter()
        .find_map(|child| decode_gmail_body(child, mime_type))
}

async fn authorized_get_json(
    app_handle: &AppHandle,
    app_settings: &settings::AppSettings,
    url: reqwest::Url,
) -> Result<serde_json::Value, String> {
    let session = refresh_workspace_session_if_needed(app_handle, app_settings).await?;
    let token = session
        .access_token
        .clone()
        .ok_or_else(|| "No Google access token is available.".to_string())?;

    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Google API request failed: {body}"));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|error| error.to_string())
}

async fn authorized_post_json(
    app_handle: &AppHandle,
    app_settings: &settings::AppSettings,
    url: &str,
    body: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let session = refresh_workspace_session_if_needed(app_handle, app_settings).await?;
    let token = session
        .access_token
        .clone()
        .ok_or_else(|| "No Google access token is available.".to_string())?;

    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .header(AUTHORIZATION, format!("Bearer {token}"))
        .json(&body)
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Google API request failed: {body}"));
    }

    response
        .json::<serde_json::Value>()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn sign_in_with_google_bridge(
    app_handle: AppHandle,
    db: State<'_, crate::history::Database>,
) -> Result<GoogleAuthStatus, String> {
    let app_settings = {
        let conn = db.0.lock().map_err(|error| error.to_string())?;
        settings::load_from_connection(&conn)?
    };

    start_bridge_sign_in(
        &app_handle,
        &app_settings,
        GoogleSessionKind::Identity,
        None,
    )
    .await?;
    get_google_auth_status(app_handle, db)
}

#[tauri::command]
pub async fn connect_google_workspace(
    app_handle: AppHandle,
    scopes: Option<Vec<String>>,
    db: State<'_, crate::history::Database>,
) -> Result<GoogleAuthStatus, String> {
    let app_settings = {
        let conn = db.0.lock().map_err(|error| error.to_string())?;
        settings::load_from_connection(&conn)?
    };

    let session = start_bridge_sign_in(
        &app_handle,
        &app_settings,
        GoogleSessionKind::Workspace,
        scopes,
    )
    .await?;
    persist_workspace_capabilities(&db, &session)?;
    get_google_auth_status(app_handle, db)
}

#[tauri::command]
pub fn get_google_auth_status(
    app_handle: AppHandle,
    db: State<'_, crate::history::Database>,
) -> Result<GoogleAuthStatus, String> {
    let app_settings = {
        let conn = db.0.lock().map_err(|error| error.to_string())?;
        settings::load_from_connection(&conn)?
    };

    let identity = shared_keychain::load_session(
        &app_handle,
        shared_keychain::KeychainNamespace::Identity,
        access_group(&app_settings),
    )?;
    let workspace = shared_keychain::load_session(
        &app_handle,
        shared_keychain::KeychainNamespace::Workspace,
        access_group(&app_settings),
    )?;

    Ok(GoogleAuthStatus {
        identity_connected: identity.is_some(),
        workspace_connected: workspace.is_some(),
        email: workspace
            .as_ref()
            .and_then(|session| session.email.clone())
            .or_else(|| identity.as_ref().and_then(|session| session.email.clone())),
        workspace_scopes: workspace.map(|session| session.scopes).unwrap_or_default(),
    })
}

#[tauri::command]
pub fn sign_out_google_bridge(
    app_handle: AppHandle,
    db: State<'_, crate::history::Database>,
) -> Result<bool, String> {
    let conn = db.0.lock().map_err(|error| error.to_string())?;
    let mut app_settings = settings::load_from_connection(&conn)?;
    let group = access_group(&app_settings);

    shared_keychain::delete_session(
        &app_handle,
        shared_keychain::KeychainNamespace::Identity,
        group,
    )?;
    shared_keychain::delete_session(
        &app_handle,
        shared_keychain::KeychainNamespace::Workspace,
        group,
    )?;

    app_settings.gmail_enabled = false;
    app_settings.drive_enabled = false;
    settings::save_to_connection(&conn, &app_settings)?;

    Ok(true)
}

#[tauri::command]
pub async fn gmail_list_messages(
    app_handle: AppHandle,
    query: Option<String>,
    max_results: Option<u16>,
    db: State<'_, crate::history::Database>,
) -> Result<Vec<GmailListItem>, String> {
    let app_settings = {
        let conn = db.0.lock().map_err(|error| error.to_string())?;
        settings::load_from_connection(&conn)?
    };

    let max_results = max_results.unwrap_or(10).clamp(1, 25);
    let mut list_url =
        reqwest::Url::parse("https://gmail.googleapis.com/gmail/v1/users/me/messages")
            .map_err(|error| error.to_string())?;
    list_url
        .query_pairs_mut()
        .append_pair("maxResults", &max_results.to_string());

    if let Some(query) = query.filter(|value| !value.trim().is_empty()) {
        list_url.query_pairs_mut().append_pair("q", query.trim());
    }

    let list_json = authorized_get_json(&app_handle, &app_settings, list_url).await?;
    let messages = list_json
        .get("messages")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    let mut output = Vec::new();
    for item in messages {
        let id = match item.get("id").and_then(|value| value.as_str()) {
            Some(value) => value.to_string(),
            None => continue,
        };

        let mut detail_url = reqwest::Url::parse(&format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}"
        ))
        .map_err(|error| error.to_string())?;
        detail_url
            .query_pairs_mut()
            .append_pair("format", "metadata")
            .append_pair("metadataHeaders", "From")
            .append_pair("metadataHeaders", "To")
            .append_pair("metadataHeaders", "Subject")
            .append_pair("metadataHeaders", "Date");

        let detail = authorized_get_json(&app_handle, &app_settings, detail_url).await?;
        let headers = detail
            .get("payload")
            .and_then(|payload| payload.get("headers"))
            .and_then(|value| value.as_array())
            .cloned()
            .unwrap_or_default();

        output.push(GmailListItem {
            id,
            thread_id: detail
                .get("threadId")
                .and_then(|value| value.as_str())
                .map(|value| value.to_string()),
            from: gmail_header(&headers, "From"),
            to: gmail_header(&headers, "To"),
            subject: gmail_header(&headers, "Subject"),
            snippet: detail
                .get("snippet")
                .and_then(|value| value.as_str())
                .map(|value| value.to_string()),
            date: gmail_header(&headers, "Date"),
        });
    }

    Ok(output)
}

#[tauri::command]
pub async fn gmail_get_message(
    app_handle: AppHandle,
    message_id: String,
    db: State<'_, crate::history::Database>,
) -> Result<GmailMessage, String> {
    let app_settings = {
        let conn = db.0.lock().map_err(|error| error.to_string())?;
        settings::load_from_connection(&conn)?
    };
    let detail_url = reqwest::Url::parse(&format!(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}?format=full",
        message_id.trim()
    ))
    .map_err(|error| error.to_string())?;
    let detail = authorized_get_json(&app_handle, &app_settings, detail_url).await?;
    let headers = detail
        .get("payload")
        .and_then(|payload| payload.get("headers"))
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();
    let payload = detail.get("payload").cloned().unwrap_or_default();

    Ok(GmailMessage {
        id: detail
            .get("id")
            .and_then(|value| value.as_str())
            .unwrap_or_default()
            .to_string(),
        thread_id: detail
            .get("threadId")
            .and_then(|value| value.as_str())
            .map(|value| value.to_string()),
        from: gmail_header(&headers, "From"),
        to: gmail_header(&headers, "To"),
        subject: gmail_header(&headers, "Subject"),
        snippet: detail
            .get("snippet")
            .and_then(|value| value.as_str())
            .map(|value| value.to_string()),
        date: gmail_header(&headers, "Date"),
        body_text: decode_gmail_body(&payload, "text/plain"),
        body_html: decode_gmail_body(&payload, "text/html"),
    })
}

#[tauri::command]
pub async fn gmail_send_message(
    app_handle: AppHandle,
    to: String,
    subject: String,
    body: String,
    thread_id: Option<String>,
    db: State<'_, crate::history::Database>,
) -> Result<String, String> {
    let app_settings = {
        let conn = db.0.lock().map_err(|error| error.to_string())?;
        settings::load_from_connection(&conn)?
    };

    let mime = [
        format!("To: {}", to.trim()),
        format!("Subject: {}", subject.trim()),
        thread_id
            .as_ref()
            .map(|value| format!("References: {}", value.trim()))
            .unwrap_or_default(),
        thread_id
            .as_ref()
            .map(|value| format!("In-Reply-To: {}", value.trim()))
            .unwrap_or_default(),
        "Content-Type: text/plain; charset=\"UTF-8\"".to_string(),
        String::new(),
        body,
    ]
    .into_iter()
    .filter(|value| !value.is_empty())
    .collect::<Vec<_>>()
    .join("\r\n");

    let encoded = URL_SAFE_NO_PAD.encode(mime.as_bytes());
    let response = authorized_post_json(
        &app_handle,
        &app_settings,
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        serde_json::json!({ "raw": encoded }),
    )
    .await?;

    Ok(format!(
        "Sent Gmail message {}.",
        response
            .get("id")
            .and_then(|value| value.as_str())
            .unwrap_or("successfully")
    ))
}

#[tauri::command]
pub async fn drive_list_files(
    app_handle: AppHandle,
    query: Option<String>,
    page_size: Option<u16>,
    db: State<'_, crate::history::Database>,
) -> Result<Vec<DriveFileItem>, String> {
    let app_settings = {
        let conn = db.0.lock().map_err(|error| error.to_string())?;
        settings::load_from_connection(&conn)?
    };

    let page_size = page_size.unwrap_or(10).clamp(1, 50);
    let mut url = reqwest::Url::parse("https://www.googleapis.com/drive/v3/files")
        .map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("pageSize", &page_size.to_string())
        .append_pair(
            "fields",
            "files(id,name,mimeType,modifiedTime,owners(displayName,emailAddress),webViewLink)",
        );

    if let Some(query) = query.filter(|value| !value.trim().is_empty()) {
        url.query_pairs_mut().append_pair("q", query.trim());
    }

    let json = authorized_get_json(&app_handle, &app_settings, url).await?;
    let files = json
        .get("files")
        .and_then(|value| value.as_array())
        .cloned()
        .unwrap_or_default();

    Ok(files
        .into_iter()
        .filter_map(|item| {
            Some(DriveFileItem {
                id: item.get("id")?.as_str()?.to_string(),
                name: item.get("name")?.as_str()?.to_string(),
                mime_type: item
                    .get("mimeType")
                    .and_then(|value| value.as_str())
                    .map(|value| value.to_string()),
                modified_time: item
                    .get("modifiedTime")
                    .and_then(|value| value.as_str())
                    .map(|value| value.to_string()),
                owner: item
                    .get("owners")
                    .and_then(|value| value.as_array())
                    .and_then(|owners| owners.first())
                    .and_then(|owner| {
                        owner
                            .get("displayName")
                            .and_then(|value| value.as_str())
                            .or_else(|| owner.get("emailAddress").and_then(|value| value.as_str()))
                    })
                    .map(|value| value.to_string()),
                web_view_link: item
                    .get("webViewLink")
                    .and_then(|value| value.as_str())
                    .map(|value| value.to_string()),
            })
        })
        .collect())
}
