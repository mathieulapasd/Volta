"use client";

import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  type EditOp,
  type EmailAsset,
  type EmailDraft,
  editOpSchema,
  emailAssetSchema,
  emailDraftSchema,
} from "@/lib/schemas";

interface DraftState {
  draft: EmailDraft | null;
  edits: EditOp[];
  assets: EmailDraft["assets"];
  htmlCode: string;
}

interface DraftActions {
  setDraft: (draft: EmailDraft) => void;
  resetDraft: () => void;

  setEdits: (edits: EditOp[]) => void;
  upsertEdit: (edit: EditOp) => void;
  removeEditById: (id: string) => void;
  clearEdits: () => void;

  setAssets: (assets: EmailDraft["assets"]) => void;
  addAsset: (asset: EmailAsset) => void;
  removeAssetById: (id: string) => void;

  setHtmlCode: (html: string) => void;
}

export type DraftStore = DraftState & DraftActions;

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      draft: null,
      edits: [],
      assets: [],
      htmlCode: "",

      setDraft: (draft) => {
        const parsed = emailDraftSchema.safeParse(draft);

        if (!parsed.success) {
          console.warn("useDraftStore:setDraft invalid draft", parsed.error.flatten());

          return;
        }
        set({ draft: parsed.data, assets: parsed.data.assets, edits: [], htmlCode: parsed.data.html_inline });
      },

      resetDraft: () => {
        set({ draft: null, edits: [], assets: [], htmlCode: "" });
      },

      setEdits: (edits) => {
        set({ edits });
      },

      upsertEdit: (edit) => {
        const current = get().edits;
        const without = current.filter((e) => e.id !== edit.id);

        set({ edits: [...without, edit] });
      },

      removeEditById: (id) => {
        set((state) => ({ edits: state.edits.filter((e) => e.id !== id) }));
      },

      clearEdits: () => {
        set({ edits: [] });
      },

      setAssets: (assets) => {
        set({ assets });
      },

      addAsset: (asset) => {
        set((state) => ({ assets: [...state.assets, asset] }));
      },

      removeAssetById: (id) => {
        set((state) => ({ assets: state.assets.filter((a) => a.id !== id) }));
      },

      setHtmlCode: (html) => {
        set({ htmlCode: html });
      },
    }),
    {
      name: "email-builder-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        const defaults: DraftState = { draft: null, edits: [], assets: [], htmlCode: "" };

        // Extract inner state, validate with zod; avoid passthrough
        const candidateState = (persisted as { state?: unknown } | null)?.state;

        const stateSchema = z.object({
          draft: emailDraftSchema.nullable(),
          edits: z.array(editOpSchema),
          assets: z.array(emailAssetSchema),
          htmlCode: z.string().optional(),
        });

        const parsedState = stateSchema.safeParse(candidateState);

        if (!parsedState.success) {
          return { state: defaults, version: 1 };
        }

        const validated = parsedState.data;

        const state: DraftState = {
          draft: validated.draft,
          edits: validated.edits,
          // Prefer draft.assets if draft exists to ensure consistency
          assets: validated.draft ? validated.draft.assets : validated.assets,
          htmlCode: validated.htmlCode ?? (validated.draft ? validated.draft.html_inline : ""),
        };

        // Use version param for migrations
        if (!version || version < 2) {
          return { state, version: 2 };
        }

        return { state, version };
      },
      partialize: (state) => ({
        draft: state.draft,
        edits: state.edits,
        assets: state.assets,
        htmlCode: state.htmlCode,
      }),
    }
  )
);
