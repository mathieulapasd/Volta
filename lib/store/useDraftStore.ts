"use client";

import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type EmailAsset, type EmailDraft, emailDraftSchema } from "@/lib/schemas";

interface DraftState {
  draft: EmailDraft | null;
  viewMode: "preview" | "html";
  _hasHydrated: boolean;
}

interface DraftActions {
  setDraft: (draft: EmailDraft) => void;
  resetDraft: () => void;

  updateDraftHtml: (html: string) => void;
  updateDraftCss: (css: string) => void;

  updateDraftConfig: (config: EmailDraft["config"]) => void;

  addAsset: (asset: Omit<EmailAsset, "id"> & { id?: string }) => EmailAsset;
  getAssetByFilename: (filename: string) => EmailAsset | undefined;

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

      updateDraftCss: (css) => {
        const current = get().draft;

        if (!current) {
          return;
        }

        const next: EmailDraft = { ...current, css_inline: css };

        set({ draft: next });
      },

      updateDraftConfig: (config) => {
        const current = get().draft;

        if (!current) {
          return;
        }

        const next: EmailDraft = { ...current, config };

        set({ draft: next });
      },

      addAsset: (asset) => {
        const current = get().draft;

        if (!current) {
          throw new Error("No draft to attach asset to");
        }

        const id = asset.id ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        const nextAsset: EmailAsset = {
          id,
          filename: asset.filename,
          mimeType: asset.mimeType,
          dataUrl: asset.dataUrl,
        };

        const next: EmailDraft = { ...current, assets: [...(current.assets ?? []), nextAsset] };

        set({ draft: next });

        return nextAsset;
      },

      getAssetByFilename: (filename) => {
        const current = get().draft;

        return current?.assets?.find((a) => a.filename === filename);
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
      version: 4,
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

        // If strict parse fails (older persisted shape), try legacy parse without css_inline
        if (!parsedState.success) {
          const legacyStateSchema = z.object({
            draft: emailDraftSchema.omit({ css_inline: true }).nullable(),
          });

          const legacyParsed = legacyStateSchema.safeParse(candidateState);

          if (legacyParsed.success) {
            const legacyDraft = legacyParsed.data.draft;

            const state: DraftState = {
              draft: legacyDraft
                ? ({
                    css_inline: "",
                    html_inline: legacyDraft.html_inline,
                    manifest: legacyDraft.manifest,
                    config: legacyDraft.config,
                    assets: legacyDraft.assets ?? [],
                  } as EmailDraft)
                : null,
              viewMode: "preview",
              _hasHydrated: false,
            };

            return { state, version: 4 };
          }

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
        if (version < 3) {
          // Ensure assets array exists when migrating to v3
          const nextDraft = state.draft ? { ...state.draft, assets: state.draft.assets ?? [] } : null;
          return { state: { ...state, draft: nextDraft }, version: 3 };
        }

        if (version < 4) {
          // Add css_inline with default when migrating to v4
          const nextDraft = state.draft ? { ...state.draft, css_inline: state.draft.css_inline ?? "" } : null;
          return { state: { ...state, draft: nextDraft }, version: 4 };
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
