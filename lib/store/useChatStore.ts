"use client";

import { create } from "zustand";
import { type EmailMessage, emailMessageSchema } from "@/lib/schemas";

interface ChatState {
  messages: EmailMessage[];
  tokenCount: number;
}

interface ChatActions {
  setMessages: (messages: EmailMessage[]) => void;
  appendMessage: (message: EmailMessage) => void;
  clearMessages: () => void;
  incrementTokens: (count: number) => void;
  resetTokens: () => void;
}

type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()((set) => ({
  messages: [],
  tokenCount: 0,

  setMessages: (messages) => {
    const validated: EmailMessage[] = [];

    for (const candidate of messages) {
      const parsed = emailMessageSchema.safeParse(candidate);

      if (parsed.success) {
        validated.push(parsed.data);
      }
    }

    set({ messages: validated });
  },

  appendMessage: (message) => {
    const parsed = emailMessageSchema.safeParse(message);

    if (!parsed.success) {
      return;
    }

    set((state) => ({ messages: [...state.messages, parsed.data] }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  incrementTokens: (count) => {
    set((state) => ({ tokenCount: state.tokenCount + count }));
  },

  resetTokens: () => {
    set({ tokenCount: 0 });
  },
}));
