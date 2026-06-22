"use client";

import { type ReactElement, useEffect } from "react";
import type { EmailMessage, UnlayerDesign } from "@/lib/schemas";
import { useChatStore } from "@/lib/store/useChatStore";
import { useDraftStore } from "@/lib/store/useDraftStore";

interface ChatInitializerProps {
  messages: EmailMessage[];
  unlayerDesign: UnlayerDesign | null;
}

export default function ChatInitializer({ messages, unlayerDesign }: ChatInitializerProps): ReactElement | null {
  const setMessages = useChatStore((s) => s.setMessages);
  const setUnlayerDesign = useDraftStore((s) => s.setUnlayerDesign);
  const setReady = useDraftStore((s) => s.setReady);

  useEffect(() => {
    setMessages(messages);
    setUnlayerDesign(unlayerDesign);
    setReady(true);

    return () => {
      setMessages([]);
      setUnlayerDesign(null);
      setReady(false);
    };
  }, [messages, unlayerDesign, setMessages, setUnlayerDesign, setReady]);

  return null;
}
