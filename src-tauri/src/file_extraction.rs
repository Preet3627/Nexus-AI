use std::collections::BTreeMap;
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;

use calamine::{open_workbook_auto, Data, Reader};
use quick_xml::events::Event;
use quick_xml::Reader as XmlReader;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use zip::ZipArchive;

const NATIVE_HELPER_FILE: &str = "NativeExtractor.swift";
const MAX_EXTRACTED_CHARS: usize = 48_000;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractedContent {
    pub path: String,
    pub file_name: String,
    pub file_type: String,
    pub extractor: String,
    pub text: String,
    pub truncated: bool,
    pub metadata: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct NativeExtractionResponse {
    text: String,
    extractor: String,
    metadata: Option<BTreeMap<String, String>>,
}

fn truncate_text(value: String) -> (String, bool) {
    let mut chars = value.chars();
    let truncated: String = chars.by_ref().take(MAX_EXTRACTED_CHARS).collect();
    let is_truncated = chars.next().is_some();
    (truncated, is_truncated)
}

fn normalize_whitespace(value: &str) -> String {
    value
        .lines()
        .map(str::trim_end)
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

fn build_result(
    path: &Path,
    file_type: &str,
    extractor: &str,
    text: String,
    metadata: BTreeMap<String, String>,
) -> ExtractedContent {
    let normalized = normalize_whitespace(&text);
    let (text, truncated) = truncate_text(normalized);

    ExtractedContent {
        path: path.display().to_string(),
        file_name: path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or_default()
            .to_string(),
        file_type: file_type.to_string(),
        extractor: extractor.to_string(),
        text,
        truncated,
        metadata,
    }
}

fn read_text_file(path: &Path) -> Result<String, String> {
    fs::read_to_string(path).map_err(|error| format!("Failed to read text file: {error}"))
}

fn ensure_helper(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("swift");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    let path = dir.join(NATIVE_HELPER_FILE);
    fs::write(&path, include_str!("../swift/NativeExtractor.swift"))
        .map_err(|error| error.to_string())?;
    Ok(path)
}

fn extract_with_native_helper(
    app_handle: &AppHandle,
    path: &Path,
) -> Result<ExtractedContent, String> {
    let helper = ensure_helper(app_handle)?;
    let output = Command::new("/usr/bin/swift")
        .arg(helper)
        .arg(path)
        .output()
        .map_err(|error| format!("Swift toolchain is required for native extraction: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Native extractor failed.".to_string()
        } else {
            stderr
        });
    }

    let response: NativeExtractionResponse = serde_json::from_slice(&output.stdout)
        .map_err(|error| format!("Failed to decode native extractor response: {error}"))?;

    let file_type = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("binary")
        .to_lowercase();

    Ok(build_result(
        path,
        &file_type,
        &response.extractor,
        response.text,
        response.metadata.unwrap_or_default(),
    ))
}

fn textutil_extract(path: &Path) -> Result<Option<String>, String> {
    let output = Command::new("/usr/bin/textutil")
        .args(["-convert", "txt", "-stdout"])
        .arg(path)
        .output()
        .map_err(|error| format!("Failed to run textutil: {error}"))?;

    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    if stdout.trim().is_empty() {
        Ok(None)
    } else {
        Ok(Some(stdout))
    }
}

fn xml_to_text(content: &str) -> Result<String, String> {
    let mut reader = XmlReader::from_str(content);
    reader.config_mut().trim_text(true);
    let mut buf = Vec::new();
    let mut text_parts = Vec::new();

    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Text(event)) => {
                let value = event
                    .decode()
                    .map_err(|error| format!("Failed to decode XML text: {error}"))?;
                if !value.trim().is_empty() {
                    text_parts.push(value.into_owned());
                }
            }
            Ok(Event::CData(event)) => {
                let value = event
                    .decode()
                    .map_err(|error| format!("Failed to decode XML CDATA: {error}"))?;
                if !value.trim().is_empty() {
                    text_parts.push(value.into_owned());
                }
            }
            Ok(Event::Eof) => break,
            Err(error) => return Err(format!("Failed to parse XML: {error}")),
            _ => {}
        }
        buf.clear();
    }

    Ok(text_parts.join("\n"))
}

fn extract_zip_xml_text(path: &Path, prefixes: &[&str]) -> Result<String, String> {
    let file = File::open(path).map_err(|error| format!("Failed to open archive: {error}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|error| format!("Failed to open zip archive: {error}"))?;
    let mut combined = Vec::new();

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("Failed to read archive entry: {error}"))?;
        let name = entry.name().to_string();

        if !prefixes.iter().any(|prefix| name.starts_with(prefix)) || !name.ends_with(".xml") {
            continue;
        }

        let mut xml = String::new();
        entry
            .read_to_string(&mut xml)
            .map_err(|error| format!("Failed to read archive XML: {error}"))?;
        let text = xml_to_text(&xml)?;
        if !text.trim().is_empty() {
            combined.push(text);
        }
    }

    if combined.is_empty() {
        Err("No readable document text was found in the archive.".to_string())
    } else {
        Ok(combined.join("\n\n"))
    }
}

fn data_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(value) => value.clone(),
        Data::Float(value) => value.to_string(),
        Data::Int(value) => value.to_string(),
        Data::Bool(value) => value.to_string(),
        Data::DateTime(value) => value.to_string(),
        Data::DateTimeIso(value) => value.clone(),
        Data::DurationIso(value) => value.clone(),
        Data::Error(value) => format!("Error({value:?})"),
    }
}

fn extract_spreadsheet(path: &Path) -> Result<(String, BTreeMap<String, String>), String> {
    let mut workbook =
        open_workbook_auto(path).map_err(|error| format!("Failed to open spreadsheet: {error}"))?;
    let mut sections = Vec::new();
    let mut sheet_count = 0usize;

    for sheet_name in workbook.sheet_names().to_owned() {
        if let Ok(range) = workbook.worksheet_range(&sheet_name) {
            sheet_count += 1;
            let rows = range
                .rows()
                .map(|row| {
                    row.iter()
                        .map(data_to_string)
                        .filter(|cell| !cell.trim().is_empty())
                        .collect::<Vec<_>>()
                        .join("\t")
                })
                .filter(|row| !row.trim().is_empty())
                .collect::<Vec<_>>();

            if !rows.is_empty() {
                sections.push(format!("Sheet: {sheet_name}\n{}", rows.join("\n")));
            }
        }
    }

    if sections.is_empty() {
        return Err("The spreadsheet did not contain readable rows.".to_string());
    }

    let mut metadata = BTreeMap::new();
    metadata.insert("sheets".to_string(), sheet_count.to_string());

    Ok((sections.join("\n\n"), metadata))
}

fn detect_file_type(path: &Path) -> String {
    path.extension()
        .and_then(|value| value.to_str())
        .unwrap_or("unknown")
        .to_lowercase()
}

fn extract(path: &Path, app_handle: &AppHandle) -> Result<ExtractedContent, String> {
    let file_type = detect_file_type(path);
    let empty_metadata = BTreeMap::new();

    let text_extensions = [
        "txt", "md", "markdown", "json", "jsonl", "csv", "tsv", "html", "htm", "xml", "yaml",
        "yml", "toml", "ini", "conf", "log", "rs", "ts", "tsx", "js", "jsx", "py", "java", "kt",
        "swift", "go", "rb", "php", "c", "h", "cpp", "hpp", "css", "scss", "sql",
    ];
    let image_extensions = ["png", "jpg", "jpeg", "webp", "gif", "heic", "tiff", "bmp"];
    let spreadsheet_extensions = ["xlsx", "xls", "xlsm", "ods", "csv"];

    if text_extensions.contains(&file_type.as_str()) {
        return Ok(build_result(
            path,
            &file_type,
            "utf8-text",
            read_text_file(path)?,
            empty_metadata,
        ));
    }

    if file_type == "pdf" || image_extensions.contains(&file_type.as_str()) {
        return extract_with_native_helper(app_handle, path);
    }

    if spreadsheet_extensions.contains(&file_type.as_str()) && file_type != "csv" {
        let (text, metadata) = extract_spreadsheet(path)?;
        return Ok(build_result(path, &file_type, "calamine", text, metadata));
    }

    if file_type == "docx" {
        let text = extract_zip_xml_text(path, &["word/"])?;
        return Ok(build_result(path, "docx", "zip-xml", text, empty_metadata));
    }

    if file_type == "pptx" {
        let text = extract_zip_xml_text(path, &["ppt/slides/"])?;
        return Ok(build_result(path, "pptx", "zip-xml", text, empty_metadata));
    }

    if matches!(file_type.as_str(), "doc" | "rtf" | "odt" | "pages") {
        if let Some(text) = textutil_extract(path)? {
            return Ok(build_result(
                path,
                &file_type,
                "textutil",
                text,
                empty_metadata,
            ));
        }
    }

    if let Some(text) = textutil_extract(path)? {
        return Ok(build_result(
            path,
            &file_type,
            "textutil",
            text,
            empty_metadata,
        ));
    }

    Err(format!(
        "Nexus AI cannot extract readable text from `{}.`",
        path.display()
    ))
}

#[tauri::command]
pub fn extract_file_content(
    app_handle: tauri::AppHandle,
    path: String,
) -> Result<ExtractedContent, String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Provide a local file path after /extract.".to_string());
    }

    let file_path = PathBuf::from(trimmed);
    if !file_path.exists() {
        return Err(format!("The file does not exist: {}", file_path.display()));
    }

    if !file_path.is_file() {
        return Err(format!("The path is not a file: {}", file_path.display()));
    }

    extract(&file_path, &app_handle)
}
