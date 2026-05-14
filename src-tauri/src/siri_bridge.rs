use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Read, Write},
    net::{TcpListener, TcpStream},
    sync::mpsc::{self, Receiver, Sender},
    thread,
    time::Duration,
};

use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State};

const SIRI_BRIDGE_ADDR: &str = "127.0.0.1:48321";
const SIRI_BRIDGE_EVENT: &str = "nexus://siri-pending";
const SIRI_BRIDGE_TIMEOUT: Duration = Duration::from_secs(90);

#[derive(Default)]
pub struct SiriBridgeState {
    pending: Mutex<HashMap<String, PendingSiriRequest>>,
}

struct PendingSiriRequest {
    message: String,
    claimed: bool,
    responder: Sender<Result<String, String>>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SiriBridgeRequest {
    pub id: String,
    pub message: String,
}

#[derive(Debug, Deserialize)]
struct SiriAskRequest {
    message: String,
}

#[derive(Debug, Serialize)]
struct SiriAskSuccessResponse {
    reply: String,
}

#[derive(Debug, Serialize)]
struct SiriAskErrorResponse {
    error: String,
}

impl SiriBridgeState {
    fn enqueue(&self, message: String) -> (String, Receiver<Result<String, String>>) {
        let id = uuid::Uuid::new_v4().to_string();
        let (tx, rx) = mpsc::channel();
        self.pending.lock().insert(
            id.clone(),
            PendingSiriRequest {
                message,
                claimed: false,
                responder: tx,
            },
        );
        (id, rx)
    }

    fn claim_pending(&self) -> Vec<SiriBridgeRequest> {
        let mut pending = self.pending.lock();
        pending
            .iter_mut()
            .filter_map(|(id, request)| {
                if request.claimed {
                    return None;
                }
                request.claimed = true;
                Some(SiriBridgeRequest {
                    id: id.clone(),
                    message: request.message.clone(),
                })
            })
            .collect()
    }

    fn resolve(&self, request_id: &str, result: Result<String, String>) -> Result<(), String> {
        let request = self
            .pending
            .lock()
            .remove(request_id)
            .ok_or_else(|| format!("No pending Siri request with id {request_id}."))?;

        request
            .responder
            .send(result)
            .map_err(|_| "The Siri bridge response channel closed before delivery.".to_string())
    }

    fn cancel(&self, request_id: &str) {
        self.pending.lock().remove(request_id);
    }
}

fn write_json_response<T: Serialize>(
    stream: &mut TcpStream,
    status_line: &str,
    payload: &T,
) -> std::io::Result<()> {
    let body = serde_json::to_vec(payload)
        .unwrap_or_else(|_| b"{\"error\":\"Serialization failed.\"}".to_vec());
    let response = format!(
        "HTTP/1.1 {status_line}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );

    stream.write_all(response.as_bytes())?;
    stream.write_all(&body)?;
    stream.flush()
}

fn write_error_response(
    stream: &mut TcpStream,
    status_line: &str,
    message: impl Into<String>,
) -> std::io::Result<()> {
    write_json_response(
        stream,
        status_line,
        &SiriAskErrorResponse {
            error: message.into(),
        },
    )
}

fn read_http_request(stream: &TcpStream) -> Result<(String, String, Vec<u8>), String> {
    let mut reader = BufReader::new(
        stream
            .try_clone()
            .map_err(|error| format!("Failed to clone loopback stream: {error}"))?,
    );

    let mut request_line = String::new();
    let bytes = reader
        .read_line(&mut request_line)
        .map_err(|error| format!("Failed to read request line: {error}"))?;
    if bytes == 0 {
        return Err("The Siri bridge received an empty request.".to_string());
    }

    let mut request_parts = request_line.split_whitespace();
    let method = request_parts
        .next()
        .ok_or_else(|| "The Siri bridge request was missing an HTTP method.".to_string())?
        .to_string();
    let path = request_parts
        .next()
        .ok_or_else(|| "The Siri bridge request was missing a path.".to_string())?
        .to_string();

    let mut content_length = 0usize;
    loop {
        let mut line = String::new();
        let bytes = reader
            .read_line(&mut line)
            .map_err(|error| format!("Failed to read Siri bridge headers: {error}"))?;
        if bytes == 0 || line == "\r\n" {
            break;
        }

        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("Content-Length") {
                content_length = value.trim().parse::<usize>().map_err(|_| {
                    "The Siri bridge received an invalid Content-Length header.".to_string()
                })?;
            }
        }
    }

    let mut body = vec![0u8; content_length];
    reader
        .read_exact(&mut body)
        .map_err(|error| format!("Failed to read Siri bridge body: {error}"))?;

    Ok((method, path, body))
}

fn handle_siri_ask(mut stream: TcpStream, app_handle: AppHandle, body: Vec<u8>) {
    let request: SiriAskRequest = match serde_json::from_slice(&body) {
        Ok(request) => request,
        Err(error) => {
            let _ = write_error_response(
                &mut stream,
                "400 Bad Request",
                format!("The Siri bridge body was not valid JSON: {error}"),
            );
            return;
        }
    };

    let message = request.message.trim();
    if message.is_empty() {
        let _ = write_error_response(
            &mut stream,
            "400 Bad Request",
            "Provide a message for Nexus after \"ask Nexus to\".",
        );
        return;
    }

    let (request_id, receiver) = {
        let state = app_handle.state::<SiriBridgeState>();
        state.enqueue(message.to_string())
    };

    let _ = app_handle.emit(SIRI_BRIDGE_EVENT, ());

    match receiver.recv_timeout(SIRI_BRIDGE_TIMEOUT) {
        Ok(Ok(reply)) => {
            let _ = write_json_response(&mut stream, "200 OK", &SiriAskSuccessResponse { reply });
        }
        Ok(Err(error)) => {
            let _ = write_error_response(&mut stream, "500 Internal Server Error", error);
        }
        Err(_) => {
            app_handle.state::<SiriBridgeState>().cancel(&request_id);
            let _ = write_error_response(
                &mut stream,
                "504 Gateway Timeout",
                "Nexus timed out before it produced a Siri response.",
            );
        }
    }
}

fn handle_connection(stream: TcpStream, app_handle: AppHandle) {
    let mut stream = stream;
    let (method, path, body) = match read_http_request(&stream) {
        Ok(request) => request,
        Err(error) => {
            let _ = write_error_response(&mut stream, "400 Bad Request", error);
            return;
        }
    };

    if method != "POST" {
        let _ = write_error_response(
            &mut stream,
            "405 Method Not Allowed",
            "The Siri bridge only accepts POST requests.",
        );
        return;
    }

    if path != "/v1/siri/ask" {
        let _ = write_error_response(
            &mut stream,
            "404 Not Found",
            "The requested Siri bridge route does not exist.",
        );
        return;
    }

    handle_siri_ask(stream, app_handle, body);
}

pub fn spawn_server(app_handle: AppHandle) {
    thread::spawn(move || {
        let listener = match TcpListener::bind(SIRI_BRIDGE_ADDR) {
            Ok(listener) => listener,
            Err(error) => {
                eprintln!("nexus-ai: [siri_bridge] failed to bind {SIRI_BRIDGE_ADDR}: {error}");
                return;
            }
        };

        for incoming in listener.incoming() {
            let Ok(stream) = incoming else {
                continue;
            };
            let handle = app_handle.clone();
            thread::spawn(move || handle_connection(stream, handle));
        }
    });
}

#[tauri::command]
pub fn claim_pending_siri_requests(state: State<'_, SiriBridgeState>) -> Vec<SiriBridgeRequest> {
    state.claim_pending()
}

#[tauri::command]
pub fn resolve_siri_request(
    request_id: String,
    reply: Option<String>,
    error: Option<String>,
    state: State<'_, SiriBridgeState>,
) -> Result<(), String> {
    let reply = reply.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    let error = error.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    let result = match (reply, error) {
        (Some(reply), _) => Ok(reply),
        (_, Some(error)) => Err(error),
        _ => Err("Siri requests must resolve with either a reply or an error.".to_string()),
    };

    state.resolve(request_id.trim(), result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn claims_each_pending_request_once() {
        let state = SiriBridgeState::default();
        let _ = state.enqueue("First".to_string());
        let _ = state.enqueue("Second".to_string());

        let claimed = state.claim_pending();
        assert_eq!(claimed.len(), 2);
        assert!(state.claim_pending().is_empty());
    }

    #[test]
    fn resolve_round_trip_delivers_reply() {
        let state = SiriBridgeState::default();
        let (request_id, receiver) = state.enqueue("Summarize this".to_string());

        state
            .resolve(&request_id, Ok("Done".to_string()))
            .expect("request should resolve");

        let result = receiver
            .recv_timeout(Duration::from_secs(1))
            .expect("reply should be delivered");
        assert_eq!(result.expect("reply should be ok"), "Done");
    }
}
