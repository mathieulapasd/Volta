"use client";

import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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

export type ChatStore = ChatState & ChatActions;

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      messages: [
        {
          id: "1",
          role: "assistant",
          content:
            "Bonjour! Je suis votre assistant de génération d'e-mail. Décrivez l'e-mail que vous souhaitez créer et je le générerai pour vous. Vous pouvez également importer des images ou les importer depuis des URL.",
          timestamp: new Date().toISOString(),
        },
      ],
      tokenCount: 0,

      setMessages: (messages) => {
        // Validate in bulk; filter invalid entries
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
    }),
    {
      name: "email-builder-chat-store",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const defaults: ChatState = { messages: [], tokenCount: 0 };

        const candidateState = (persisted as { state?: unknown } | null)?.state;

        const stateSchema = z.object({
          messages: z.array(emailMessageSchema),
          tokenCount: z.number().int().nonnegative(),
        });

        const parsedState = stateSchema.safeParse(candidateState);

        if (!parsedState.success) {
          return { state: defaults, version: 1 };
        }

        const validated = parsedState.data;

        if (!version || version < 1) {
          return { state: validated, version: 1 };
        }

        return { state: validated, version };
      },
      partialize: (state) => ({
        messages: state.messages,
        tokenCount: state.tokenCount,
      }),
    }
  )
);
