"use client";

import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type EmailDraft, emailDraftSchema } from "@/lib/schemas";

interface DraftState {
  draft: EmailDraft | null;
  viewMode: "preview" | "html";
  _hasHydrated: boolean;
}

interface DraftActions {
  setDraft: (draft: EmailDraft) => void;
  resetDraft: () => void;

  updateDraftHtml: (html: string) => void;

  setViewMode: (viewMode: "preview" | "html") => void;

  setHasHydrated: (state: boolean) => void;
}

type DraftStore = DraftState & DraftActions;

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      draft: null,
      viewMode: "preview",
      _hasHydrated: false,

      setDraft: (draft) => {
        const parsed = emailDraftSchema.safeParse(draft);

        if (!parsed.success) {
          console.warn("useDraftStore:setDraft invalid draft", z.treeifyError(parsed.error));

          return;
        }

        set({ draft: parsed.data });
      },

      resetDraft: () => {
        set({ draft: null });
      },

      updateDraftHtml: (html) => {
        const current = get().draft;

        if (!current) {
          return;
        }

        const next: EmailDraft = { ...current, html_inline: html };

        set({ draft: next });
      },

      setViewMode: (viewMode) => {
        set({ viewMode });
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "email-builder-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (state) => {
        return () => {
          try {
            state.setHasHydrated(true);
          } catch {
            // no-op
          }
        };
      },
      migrate: (persisted, version) => {
        const defaults: DraftState = { draft: null, viewMode: "preview", _hasHydrated: false };

        // Extract inner state, validate with zod; avoid passthrough
        const candidateState = (persisted as { state?: unknown } | null)?.state;

        const stateSchema = z.object({
          draft: emailDraftSchema.nullable(),
        });

        const parsedState = stateSchema.safeParse(candidateState);

        if (!parsedState.success) {
          return { state: defaults, version: 1 };
        }

        const validated = parsedState.data;

        const state: DraftState = {
          draft: validated.draft,
          viewMode: "preview",
          _hasHydrated: false,
        };

        // Use version param for migrations
        if (!version || version < 2) {
          return { state, version: 2 };
        }

        return { state, version };
      },
      partialize: (state) => ({
        draft: state.draft,
        viewMode: state.viewMode,
        // _hasHydrated is runtime-only and should not be persisted
      }),
    }
  )
);
