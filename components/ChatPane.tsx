"use client";

import { Bot, Link, Send, Upload, User } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { sendMessage } from "@/lib/ai";
import type { EmailMessage } from "@/lib/schemas";
import { useChatStore } from "@/lib/store/useChatStore";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

export default function ChatPane() {
  const assets = useDraftStore((s) => s.assets);
  const setAssets = useDraftStore((s) => s.setAssets);
  const setDraft = useDraftStore((s) => s.setDraft);

  const messages = useChatStore((s) => s.messages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const tokenCount = useChatStore((s) => s.tokenCount);
  const incrementTokens = useChatStore((s) => s.incrementTokens);

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [temperature] = useState([0.7]);
  const [urlInput, setUrlInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: necessary
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) {
      return;
    }

    const userMessage: EmailMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    appendMessage(userMessage);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await sendMessage(input, temperature[0], assets);

      const assistantMessage: EmailMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.content,
        timestamp: new Date().toISOString(),
      };

      appendMessage(assistantMessage);
      incrementTokens(response.tokenCount);

      if (response.draft) {
        setDraft(response.draft);
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
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image");

      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newAsset = {
        id: `img-${Date.now()}`,
        filename: file.name,
        mime: file.type,
        source: dataUrl,
        alt: file.name.replace(/\.[^/.]+$/, ""),
        width: undefined,
        height: undefined,
      };

      setAssets([...assets, newAsset]);
    };

    reader.readAsDataURL(file);
  };

  const handleUrlImport = () => {
    if (!urlInput.trim()) {
      return;
    }

    const newAsset = {
      id: `img-${Date.now()}`,
      filename: urlInput.split("/").pop() || "imported-image",
      mime: "image/jpeg", // Default, could be improved with detection
      source: urlInput,
      alt: "Image importée",
      width: undefined,
      height: undefined,
    };

    setAssets([...assets, newAsset]);
    setUrlInput("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-xl">Générateur d'e-mail</h1>
          <Badge variant="outline" className="text-xs">
            v0.1.0
          </Badge>
          {/* <div className="text-muted-foreground text-sm">Tokens: {tokenCount}</div> */}
        </div>

        {/* Temperature Control */}
        {/* <div className="space-y-2">
          <span className="font-medium text-sm">Température: {temperature[0]}</span>
          <Slider value={temperature} onValueChange={setTemperature} max={1} min={0} step={0.1} className="w-full" />
        </div> */}
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
                <Bot className="size-4 text-primary-foreground" />
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
              <Bot className="size-4 animate-pulse text-primary-foreground" />
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

      {/* Assets */}
      {assets.length > 0 && (
        <div className="border-border border-t p-4">
          <h3 className="mb-2 font-medium text-sm">Ressources ({assets.length})</h3>
          <div className="flex flex-wrap gap-2">
            {assets.map((asset) => (
              <div key={asset.id} className="rounded bg-muted px-2 py-1 text-xs">
                {asset.filename}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="space-y-3 border-border border-t p-4">
        {/* Image Upload/Import */}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload />
            Importer une image
          </Button>
          <div className="flex flex-1 space-x-2">
            <Input
              placeholder="URL de l'image..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="text-sm"
            />
            <Button variant="outline" size="sm" onClick={handleUrlImport} disabled={!urlInput.trim()}>
              <Link />
            </Button>
          </div>
        </div>

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
          <Button onClick={handleSend} disabled={!input.trim() || isStreaming} size="sm">
            <Send />
          </Button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
    </div>
  );
}
