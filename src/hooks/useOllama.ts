import { useCallback, useRef, useState } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { stepCountIs, streamText } from "ai";
import { buildModelMessages, buildSystemPrompt } from "../services/ai/messages";
import {
  createLanguageModel,
  getActiveProvider,
  getActiveModel,
} from "../services/ai/provider";
import { createProviderTools } from "../services/ai/providerTools";
import { createDesktopTools } from "../services/ai/tools";
import type { Message, OllamaErrorKind, StreamChunk } from "../types/chat";
import type { AppSettings } from "../types/settings";

export type { Message, OllamaErrorKind, StreamChunk } from "../types/chat";

interface CompletedTurn {
  userMsg: Message;
  assistantMsg: Message;
}

function missingProviderKeyMessage(provider: string): string {
  switch (provider) {
    case "openai":
      return "OpenAI is selected, but no OpenAI API key is configured yet.";
    case "google":
      return "Google Gemini is selected, but no Google API key is configured yet.";
    case "anthropic":
      return "Anthropic is selected, but no Anthropic API key is configured yet.";
    case "xai":
      return "xAI is selected, but no xAI API key is configured yet.";
    case "groq":
      return "Groq is selected, but no Groq API key is configured yet.";
    default:
      return "The selected AI provider is not configured yet.";
  }
}

export function useOllama(
  onTurnComplete?: (userMsg: Message, assistantMsg: Message) => void,
  settings?: AppSettings | null,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  const appendLocalTurn = useCallback(
    (
      displayContent: string,
      assistantContent: string,
      options?: {
        quotedText?: string;
        imagePaths?: string[];
        errorKind?: OllamaErrorKind;
      },
    ) => {
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayContent,
        quotedText: options?.quotedText,
        imagePaths:
          options?.imagePaths && options.imagePaths.length > 0
            ? options.imagePaths
            : undefined,
      };

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        errorKind: options?.errorKind,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      onTurnComplete?.(userMsg, assistantMsg);
    },
    [onTurnComplete],
  );

  const askViaOllama = useCallback(
    async (
      userMsg: Message,
      assistantId: string,
      onFinish?: (turn: CompletedTurn) => void,
      onError?: (error: Error) => void,
      think?: boolean,
    ): Promise<void> => {
      const channel = new Channel<StreamChunk>();
      let currentContent = "";
      let currentThinkingContent = "";
      let settled = false;

      channel.onmessage = (chunk) => {
        if (chunk.type === "ThinkingToken") {
          currentThinkingContent += chunk.data;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, thinkingContent: currentThinkingContent }
                : message,
            ),
          );
          return;
        }

        if (chunk.type === "Token") {
          currentContent += chunk.data;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? { ...message, content: currentContent }
                : message,
            ),
          );
          return;
        }

        if (chunk.type === "Done") {
          void invoke("log_to_terminal", {
            msg: `[OLLAMA STREAM] Completed | Final Length: ${currentContent.length} chars`,
          });
          const assistantMsg: Message = {
            id: assistantId,
            role: "assistant",
            content: currentContent,
            thinkingContent: currentThinkingContent || undefined,
          };
          setIsGenerating(false);
          onTurnComplete?.(userMsg, assistantMsg);
          settled = true;
          onFinish?.({ userMsg, assistantMsg });
          return;
        }

        if (chunk.type === "Cancelled") {
          if (!currentContent && !currentThinkingContent) {
            setMessages((prev) =>
              prev.filter((message) => message.id !== assistantId),
            );
          }
          setIsGenerating(false);
          if (!settled) {
            settled = true;
            onError?.(new Error("The request was cancelled."));
          }
          return;
        }

        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: chunk.data.message,
                  errorKind: chunk.data.kind,
                }
              : message,
          ),
        );
        setIsGenerating(false);
        if (!settled) {
          settled = true;
          onError?.(new Error(chunk.data.message));
        }
      };

      try {
        const model = settings?.ai_model?.trim() || "llama3.2";
        const baseUrl = settings?.ollama_base_url || "http://127.0.0.1:11434";
        void invoke("log_to_terminal", {
          msg: `[OLLAMA CALL] Model: ${model} | BaseURL: ${baseUrl} | Prompt: "${userMsg.content.substring(0, 100)}..."`,
        });

        await invoke("ask_ollama", {
          message: userMsg.content,
          quotedText: userMsg.quotedText ?? null,
          imagePaths:
            userMsg.imagePaths && userMsg.imagePaths.length > 0
              ? userMsg.imagePaths
              : null,
          think: think ?? false,
          baseUrl: settings?.ollama_base_url ?? null,
          model: settings?.ai_model?.trim() || null,
          onEvent: channel,
        });
      } catch (error) {
        if (!settled) {
          settled = true;
          onError?.(
            error instanceof Error
              ? error
              : new Error("The Ollama request failed."),
          );
        }
        throw error;
      }
    },
    [onTurnComplete, settings],
  );

  const askViaVercel = useCallback(
    async (
      userMsg: Message,
      assistantId: string,
      onFinish?: (turn: CompletedTurn) => void,
      onError?: (error: Error) => void,
      think?: boolean,
    ): Promise<void> => {
      const provider = getActiveProvider(settings);
      const modelName = getActiveModel(settings);
      const model = createLanguageModel(settings);

      void invoke("log_to_terminal", {
        msg: `[VERCEL AI CALL] Provider: ${provider} | Model: ${modelName} | Prompt: "${userMsg.content.substring(0, 100)}..."`,
      });

      if (!model) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: missingProviderKeyMessage(provider),
                  errorKind: "Other",
                }
              : message,
          ),
        );
        setIsGenerating(false);
        onError?.(new Error(missingProviderKeyMessage(provider)));
        return;
      }

      if (userMsg.imagePaths?.length) {
        try {
          const base64Images = await invoke<string[]>("encode_images_as_base64_command", {
            paths: userMsg.imagePaths,
          });
          userMsg.content = [
            ...base64Images.map((b64) => ({
              type: "image",
              image: b64,
            })),
            { type: "text", text: userMsg.content },
          ] as any;
        } catch (error) {
          console.error("Failed to encode images for Vercel AI:", error);
        }
      }

      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;

      const stream = streamText({
        model,
        system: buildSystemPrompt(think),
        messages: buildModelMessages([...messages, userMsg]),
        tools: {
          ...createDesktopTools(settings),
          ...createProviderTools(settings),
        },
        stopWhen: stepCountIs(6),
        abortSignal: abortController.signal,
      });

      let currentContent = "";
      let currentThinkingContent = "";
      let chunkCount = 0;

      try {
        for await (const chunk of stream.fullStream) {
          chunkCount++;
          if (chunk.type === "text-delta") {
            currentContent += chunk.text;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, content: currentContent }
                  : message,
              ),
            );
          } else if (chunk.type === "reasoning-delta") {
            currentThinkingContent += chunk.text;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? { ...message, thinkingContent: currentThinkingContent }
                  : message,
              ),
            );
          }
        }

        void invoke("log_to_terminal", {
          msg: `[VERCEL AI STREAM] Completed | Chunks: ${chunkCount} | Final Length: ${currentContent.length} chars`,
        });

        const assistantMsg: Message = {
          id: assistantId,
          role: "assistant",
          content: currentContent,
          thinkingContent: currentThinkingContent || undefined,
        };

        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? assistantMsg : message,
          ),
        );
        setIsGenerating(false);
        activeAbortControllerRef.current = null;
        onTurnComplete?.(userMsg, assistantMsg);
        onFinish?.({ userMsg, assistantMsg });
      } catch (error) {
        const wasAborted = abortController.signal.aborted;
        activeAbortControllerRef.current = null;

        if (wasAborted) {
          if (!currentContent) {
            setMessages((prev) =>
              prev.filter((message) => message.id !== assistantId),
            );
          }
          setIsGenerating(false);
          onError?.(new Error("The request was cancelled."));
          return;
        }

        const failure =
          error instanceof Error
            ? error
            : new Error("The Vercel AI request failed.");
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: failure.message,
                  errorKind: "Other",
                }
              : message,
          ),
        );
        setIsGenerating(false);
        onError?.(failure);
      }
    },
    [messages, onTurnComplete, settings],
  );

  const ask = useCallback(
    async (
      displayContent: string,
      quotedText?: string,
      imagePaths?: string[],
      think?: boolean,
    ): Promise<CompletedTurn> => {
      if (
        (!displayContent.trim() && (!imagePaths || imagePaths.length === 0)) ||
        isGenerating
      ) {
        throw new Error(
          isGenerating
            ? "Nexus is already generating a reply."
            : "Provide a message before asking Nexus.",
        );
      }

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayContent,
        quotedText,
        imagePaths:
          imagePaths && imagePaths.length > 0 ? imagePaths : undefined,
      };

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        userMsg,
        {
          id: assistantId,
          role: "assistant",
          content: "",
        },
      ]);
      setIsGenerating(true);

      try {
        return await new Promise<CompletedTurn>(async (resolve, reject) => {
          try {
            if (getActiveProvider(settings) === "ollama") {
              await askViaOllama(userMsg, assistantId, resolve, reject, think);
            } else {
              await askViaVercel(userMsg, assistantId, resolve, reject, think);
            }
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error("Something went wrong while contacting the model."),
            );
          }
        });
      } catch (error) {
        const failure =
          error instanceof Error
            ? error
            : new Error("Something went wrong while contacting the model.");
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  content: failure.message,
                  errorKind: "Other",
                }
              : message,
          ),
        );
        setIsGenerating(false);
        activeAbortControllerRef.current = null;
        throw failure;
      }
    },
    [askViaOllama, askViaVercel, isGenerating, settings],
  );

  const cancel = useCallback(async () => {
    if (!isGenerating) {
      return;
    }

    if (getActiveProvider(settings) === "ollama") {
      await invoke("cancel_generation");
      return;
    }

    activeAbortControllerRef.current?.abort();
    activeAbortControllerRef.current = null;
    setIsGenerating(false);
  }, [isGenerating, settings]);

  const reset = useCallback(() => {
    activeAbortControllerRef.current?.abort();
    activeAbortControllerRef.current = null;
    setMessages([]);
    setIsGenerating(false);

    if (getActiveProvider(settings) === "ollama") {
      void invoke("reset_conversation");
    }
  }, [settings]);

  const loadMessages = useCallback((nextMessages: Message[]) => {
    setMessages(nextMessages);
    setIsGenerating(false);
  }, []);

  return {
    messages,
    ask,
    appendLocalTurn,
    cancel,
    isGenerating,
    reset,
    loadMessages,
  };
}
