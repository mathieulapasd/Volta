"use client";

import { create } from "zustand";
import { type EmailAsset, type EmailDraft, emailDraftSchema, type UnlayerDesign } from "@/lib/schemas";

interface DraftState {
  draft: EmailDraft | null;
  unlayerDesign: UnlayerDesign | null;
  viewMode: "preview" | "html";
  isReady: boolean;
}

interface DraftActions {
  setDraft: (draft: EmailDraft) => void;
  setUnlayerDesign: (unlayerDesign: UnlayerDesign | null) => void;
  resetDraft: () => void;

  updateDraftHtml: (html: string) => void;
  updateDraftCss: (css: string) => void;

  updateDraftConfig: (config: EmailDraft["config"]) => void;

  addAsset: (asset: Omit<EmailAsset, "id"> & { id?: string }) => EmailAsset;
  getAssetByFilename: (filename: string) => EmailAsset | undefined;

  setViewMode: (viewMode: "preview" | "html") => void;
  setReady: (ready: boolean) => void;
}

type DraftStore = DraftState & DraftActions;

export const useDraftStore = create<DraftStore>()((set, get) => ({
  draft: null,
  unlayerDesign: null,
  viewMode: "preview",
  isReady: false,

  setDraft: (draft) => {
    const parsed = emailDraftSchema.safeParse(draft);

    if (!parsed.success) {
      return;
    }

    set({ draft: parsed.data });
  },

  setUnlayerDesign: (unlayerDesign) => {
    set({ unlayerDesign });
  },

  resetDraft: () => {
    set({ draft: null, unlayerDesign: null });
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

  setReady: (ready) => {
    set({ isReady: ready });
  },
}));
