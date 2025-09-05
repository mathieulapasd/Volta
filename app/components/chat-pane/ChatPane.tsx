"use client";

import { Paperclip, Send, User, X } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { EmailMessage } from "@/lib/schemas";
import { useChatStore } from "@/lib/store/useChatStore";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { cn } from "@/lib/utils";

export default function ChatPane(): ReactElement {
  const setDraft = useDraftStore((s) => s.setDraft);

  const messages = useChatStore((s) => s.messages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  // const incrementTokens = useChatStore((s) => s.incrementTokens);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  interface SelectedFile {
    id: string;
    file: File;
    key: string;
  }

  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: necessary
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    const hasMessage = input.trim().length > 0;
    const hasFiles = selectedFiles.length > 0;

    if ((!hasMessage && !hasFiles) || isStreaming) {
      return;
    }

    if (hasMessage) {
      const userMessage: EmailMessage = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        timestamp: new Date().toISOString(),
      };

      appendMessage(userMessage);
    }
    setInput("");
    setIsStreaming(true);

    try {
      const formData = new FormData();

      if (hasMessage) {
        formData.append("message", input);
      }

      for (const sf of selectedFiles) {
        formData.append("files", sf.file, sf.file.name);
      }

      const response = await fetch("/api/n8n-webhook", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();

      // const assistantMessage: EmailMessage = {
      //   id: (Date.now() + 1).toString(),
      //   role: "assistant",
      //   content: response.content,
      //   timestamp: new Date().toISOString(),
      // };

      // appendMessage(assistantMessage);
      // incrementTokens(response.tokenCount);

      if (data.output) {
        const output = JSON.parse(data.output);

        setDraft(output);
      }
    } catch (error) {
      console.error("Error sending message:", error);

      const errorMessage: EmailMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Désolé, j'ai rencontré une erreur. Veuillez réessayer.",
        timestamp: new Date().toISOString(),
      };
      appendMessage(errorMessage);
    } finally {
      setIsStreaming(false);
      setSelectedFiles([]);
    }
  };

  const openFileDialog = (): void => {
    fileInputRef.current?.click();
  };

  const generateId = (): string => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const onFilesSelected = (event: ChangeEvent<HTMLInputElement>): void => {
    const fileList = event.target.files;

    if (!fileList) {
      return;
    }

    const next: SelectedFile[] = [];
    const existingKeys = new Set(selectedFiles.map((f) => f.key));

    for (const file of Array.from(fileList)) {
      const key = `${file.name}-${file.size}-${file.lastModified}`;

      if (!existingKeys.has(key)) {
        next.push({ id: generateId(), file, key });
        existingKeys.add(key);
      }
    }

    if (next.length > 0) {
      setSelectedFiles((prev) => [...prev, ...next]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string): void => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="h-15 border-border border-b bg-primary p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.JPG" alt="Logo" width={32} height={32} />
            <h1 className="font-semibold text-primary-foreground text-xl">Générateur d'e-mail</h1>
          </div>
          <Badge variant="outline" className="text-primary-foreground text-xs">
            v0.1.0
          </Badge>
          {/* <div className="text-muted-foreground text-sm">Tokens: {tokenCount}</div> */}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex items-start space-x-3", message.role === "user" ? "justify-end" : "justify-start")}
          >
            {message.role === "assistant" && (
              <div className="flex size-8 items-center justify-center rounded-full bg-primary">
                <Image src="/logo.JPG" alt="Logo" width={32} height={32} />
              </div>
            )}
            <Card
              className={cn(
                "max-w-8/10 p-3",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <div className="mt-1 text-xs opacity-70" suppressHydrationWarning>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </Card>
            {message.role === "user" && (
              <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-start space-x-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary">
              <Image src="/logo.JPG" alt="Logo" width={32} height={32} />
            </div>
            <Card className="bg-muted p-3">
              <div className="flex space-x-1">
                <div className="size-2 animate-bounce rounded-full bg-current" />
                <div className="size-2 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.1s" }} />
                <div className="size-2 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.2s" }} />
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="space-y-3 border-border border-t p-4">
        {/* Message Input */}
        <div className="flex space-x-2">
          <Textarea
            placeholder="Décrivez l'e-mail que vous souhaitez créer..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="min-h-15 flex-1 resize-none"
          />
          <input ref={fileInputRef} type="file" multiple onChange={onFilesSelected} className="hidden" />
          <Button onClick={openFileDialog} variant="outline" size="sm" disabled={isStreaming}>
            <Paperclip />
          </Button>
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && selectedFiles.length === 0) || isStreaming}
            size="sm"
          >
            <Send />
          </Button>
        </div>
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((sf) => (
              <Badge key={sf.id} variant="secondary" className="flex items-center gap-1">
                <span className="max-w-48 truncate text-xs">{sf.file.name}</span>
                <button
                  type="button"
                  aria-label="Supprimer le fichier"
                  onClick={() => removeFile(sf.id)}
                  className="rounded p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
