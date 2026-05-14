use base64::{engine::general_purpose::STANDARD, Engine as _};
use reqwest::header::{HeaderValue, ACCEPT, AUTHORIZATION, USER_AGENT};
use serde::{Deserialize, Serialize};

use crate::settings;

const GITHUB_API_BASE: &str = "https://api.github.com";
const GITHUB_API_VERSION: &str = "2022-11-28";
const DEFAULT_USER_AGENT: &str = "Nexus-AI";

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubRepositorySummary {
    pub full_name: String,
    pub description: Option<String>,
    pub html_url: String,
    pub stargazers_count: u64,
    pub language: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubIssueSummary {
    pub title: String,
    pub html_url: String,
    pub repository_url: String,
    pub state: String,
    pub number: u64,
    pub updated_at: Option<String>,
    pub is_pull_request: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubPullRequestSummary {
    pub number: u64,
    pub title: String,
    pub html_url: String,
    pub state: String,
    pub draft: Option<bool>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubFileContentResult {
    pub repository: String,
    pub path: String,
    pub reference: Option<String>,
    pub html_url: Option<String>,
    pub download_url: Option<String>,
    pub content: String,
    pub truncated: bool,
}

#[derive(Debug, Deserialize)]
struct SearchResponse<T> {
    items: Vec<T>,
}

#[derive(Debug, Deserialize)]
struct RepoSearchItem {
    full_name: String,
    description: Option<String>,
    html_url: String,
    stargazers_count: u64,
    language: Option<String>,
    updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IssueSearchItem {
    title: String,
    html_url: String,
    repository_url: String,
    state: String,
    number: u64,
    updated_at: Option<String>,
    pull_request: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct PullRequestItem {
    number: u64,
    title: String,
    html_url: String,
    state: String,
    draft: Option<bool>,
    updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ContentResponse {
    #[serde(rename = "type")]
    item_type: String,
    encoding: Option<String>,
    content: Option<String>,
    html_url: Option<String>,
    download_url: Option<String>,
}

fn get_token(app_handle: &tauri::AppHandle) -> Option<String> {
    let settings = settings::load_from_app_handle(app_handle);
    settings
        .github_access_token
        .filter(|value| !value.trim().is_empty())
        .or_else(|| std::env::var("GITHUB_TOKEN").ok())
}

fn github_client(token: Option<&str>) -> Result<reqwest::Client, String> {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        ACCEPT,
        HeaderValue::from_static("application/vnd.github+json"),
    );
    headers.insert(USER_AGENT, HeaderValue::from_static(DEFAULT_USER_AGENT));
    headers.insert(
        "X-GitHub-Api-Version",
        HeaderValue::from_static(GITHUB_API_VERSION),
    );

    if let Some(token) = token.filter(|value| !value.trim().is_empty()) {
        let auth = format!("Bearer {}", token.trim());
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&auth).map_err(|error| error.to_string())?,
        );
    }

    reqwest::Client::builder()
        .default_headers(headers)
        .build()
        .map_err(|error| format!("Failed to build GitHub client: {error}"))
}

fn clamp_limit(limit: Option<u8>, max: u8) -> u8 {
    limit.unwrap_or(max.min(8)).clamp(1, max)
}

#[tauri::command]
pub async fn github_search_repositories(
    app_handle: tauri::AppHandle,
    query: String,
    limit: Option<u8>,
) -> Result<Vec<GitHubRepositorySummary>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err("Provide a GitHub repository search query.".to_string());
    }

    let client = github_client(get_token(&app_handle).as_deref())?;
    let per_page = clamp_limit(limit, 10).to_string();
    let mut url = reqwest::Url::parse(&format!("{GITHUB_API_BASE}/search/repositories"))
        .map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("q", trimmed)
        .append_pair("per_page", &per_page);
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("GitHub repository search failed: {error}"))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub repository search failed: {body}"));
    }

    let payload = response
        .json::<SearchResponse<RepoSearchItem>>()
        .await
        .map_err(|error| format!("Failed to parse GitHub repository search results: {error}"))?;

    Ok(payload
        .items
        .into_iter()
        .map(|item| GitHubRepositorySummary {
            full_name: item.full_name,
            description: item.description,
            html_url: item.html_url,
            stargazers_count: item.stargazers_count,
            language: item.language,
            updated_at: item.updated_at,
        })
        .collect())
}

#[tauri::command]
pub async fn github_search_issues(
    app_handle: tauri::AppHandle,
    query: String,
    limit: Option<u8>,
) -> Result<Vec<GitHubIssueSummary>, String> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
        return Err("Provide a GitHub issue or pull request search query.".to_string());
    }

    let client = github_client(get_token(&app_handle).as_deref())?;
    let per_page = clamp_limit(limit, 10).to_string();
    let mut url = reqwest::Url::parse(&format!("{GITHUB_API_BASE}/search/issues"))
        .map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("q", trimmed)
        .append_pair("per_page", &per_page);
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("GitHub issue search failed: {error}"))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("GitHub issue search failed: {body}"));
    }

    let payload = response
        .json::<SearchResponse<IssueSearchItem>>()
        .await
        .map_err(|error| format!("Failed to parse GitHub issue search results: {error}"))?;

    Ok(payload
        .items
        .into_iter()
        .map(|item| GitHubIssueSummary {
            title: item.title,
            html_url: item.html_url,
            repository_url: item.repository_url,
            state: item.state,
            number: item.number,
            updated_at: item.updated_at,
            is_pull_request: item.pull_request.is_some(),
        })
        .collect())
}

#[tauri::command]
pub async fn github_list_pull_requests(
    app_handle: tauri::AppHandle,
    owner: String,
    repo: String,
    state: Option<String>,
    limit: Option<u8>,
) -> Result<Vec<GitHubPullRequestSummary>, String> {
    let owner = owner.trim();
    let repo = repo.trim();
    if owner.is_empty() || repo.is_empty() {
        return Err("Provide both an owner and repository name.".to_string());
    }

    let pr_state = state
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("open");

    let client = github_client(get_token(&app_handle).as_deref())?;
    let per_page = clamp_limit(limit, 20).to_string();
    let mut url = reqwest::Url::parse(&format!("{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls"))
        .map_err(|error| error.to_string())?;
    url.query_pairs_mut()
        .append_pair("state", pr_state)
        .append_pair("per_page", &per_page);
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Failed to list GitHub pull requests: {error}"))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to list GitHub pull requests: {body}"));
    }

    let payload = response
        .json::<Vec<PullRequestItem>>()
        .await
        .map_err(|error| format!("Failed to parse GitHub pull requests: {error}"))?;

    Ok(payload
        .into_iter()
        .map(|item| GitHubPullRequestSummary {
            number: item.number,
            title: item.title,
            html_url: item.html_url,
            state: item.state,
            draft: item.draft,
            updated_at: item.updated_at,
        })
        .collect())
}

#[tauri::command]
pub async fn github_get_file_contents(
    app_handle: tauri::AppHandle,
    owner: String,
    repo: String,
    path: String,
    reference: Option<String>,
) -> Result<GitHubFileContentResult, String> {
    let owner = owner.trim();
    let repo = repo.trim();
    let path = path.trim();
    if owner.is_empty() || repo.is_empty() || path.is_empty() {
        return Err("Provide an owner, repository, and file path.".to_string());
    }

    let client = github_client(get_token(&app_handle).as_deref())?;
    let mut url = reqwest::Url::parse(&format!(
        "{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    ))
    .map_err(|error| error.to_string())?;
    if let Some(reference) = reference
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        url.query_pairs_mut().append_pair("ref", reference);
    }

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Failed to fetch GitHub file contents: {error}"))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Failed to fetch GitHub file contents: {body}"));
    }

    let payload = response
        .json::<ContentResponse>()
        .await
        .map_err(|error| format!("Failed to parse GitHub file response: {error}"))?;

    if payload.item_type != "file" {
        return Err("The requested GitHub path is not a file.".to_string());
    }

    let raw_content = payload.content.unwrap_or_default().replace('\n', "");

    let decoded = if payload.encoding.as_deref() == Some("base64") {
        let bytes = STANDARD
            .decode(raw_content.as_bytes())
            .map_err(|error| format!("Failed to decode GitHub file content: {error}"))?;
        String::from_utf8_lossy(&bytes).to_string()
    } else {
        raw_content
    };

    let mut chars = decoded.chars();
    let content: String = chars.by_ref().take(40_000).collect();

    Ok(GitHubFileContentResult {
        repository: format!("{owner}/{repo}"),
        path: path.to_string(),
        reference: reference.filter(|value| !value.trim().is_empty()),
        html_url: payload.html_url,
        download_url: payload.download_url,
        truncated: chars.next().is_some(),
        content,
    })
}
