/** Mirrors the Rust OllamaErrorKind enum sent over IPC. */
export type OllamaErrorKind = "NotRunning" | "ModelNotFound" | "Other";

/** Represents a single message in the chat thread. */
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  quotedText?: string;
  imagePaths?: string[];
  errorKind?: OllamaErrorKind;
  thinkingContent?: string;
}

/** The expected structure of streaming chunks emitted from the Rust backend. */
export type StreamChunk =
  | { type: "Token"; data: string }
  | { type: "ThinkingToken"; data: string }
  | { type: "Done" }
  | { type: "Cancelled" }
  | { type: "Error"; data: { kind: OllamaErrorKind; message: string } };
