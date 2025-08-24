"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ZipExportButton from "@/components/ZipExportButton";
import { applyAttributeEditToElement } from "@/lib/emailEditing";
import { type DraftStore, useDraftStore } from "@/lib/store/useDraftStore";
import { cn } from "@/lib/utils";
import BlockCustomization from "./BlockCustomization";
import Code from "./Code";
import Iframe from "./Iframe";

export default function PreviewPane() {
  const draft = useDraftStore((s) => s.draft);
  const edits = useDraftStore((s) => s.edits);
  const assets = useDraftStore((s) => s.assets);
  const setHtmlCode = useDraftStore((s) => s.setHtmlCode);

  const codeMirrorDebounceRef = useRef<number | undefined>(undefined);
  const latestHtmlRef = useRef<string>("");

  const [storeHydrated, setStoreHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track zustand-persist hydration to avoid showing unedited HTML briefly
  useEffect(() => {
    type PersistHelpers = {
      hasHydrated: () => boolean;
      onFinishHydration?: (cb: (state: DraftStore) => void) => () => void;
    };

    const withPersist = useDraftStore as unknown as { persist?: PersistHelpers };
    const persist = withPersist.persist;

    if (persist && typeof persist.hasHydrated === "function") {
      if (persist.hasHydrated()) {
        setStoreHydrated(true);
      }

      const unsub = persist.onFinishHydration?.(() => {
        setStoreHydrated(true);
      });

      return () => {
        if (typeof unsub === "function") {
          unsub();
        }
      };
    }

    // Fallback: assume hydrated next frame
    const r = window.requestAnimationFrame(() => setStoreHydrated(true));

    return () => window.cancelAnimationFrame(r);
  }, []);

  useEffect(() => {
    if (!draft) {
      if (viewMode === "html") {
        setHtmlCode(`
        <html>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #666;">
              <h2>Pas de prévisualisation disponible</h2>
              <p>Commencez une conversation pour générer un modèle d'e-mail</p>
            </body>
          </html>`);
      } else {
        setHtmlCode("");
      }

      return;
    }

    if (viewMode !== "html") {
      // Avoid regenerating htmlCode while in preview to prevent iframe reload/scroll reset
      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(draft.html_inline, "text/html");

      edits.forEach((edit) => {
        const element = doc.querySelector(`[data-id="${edit.id}"]`);

        if (!element) {
          return;
        }

        if (edit.kind === "setText") {
          element.textContent = edit.value;
        } else if (edit.kind === "setAttr") {
          applyAttributeEditToElement(element, edit, assets);
        }
      });

      setHtmlCode(doc.documentElement.outerHTML);
    } catch {
      setHtmlCode(draft.html_inline);
    }
  }, [draft, edits, assets, setHtmlCode, viewMode]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">{viewMode === "preview" ? "Prévisualisation" : "Code HTML"}</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "preview" ? "html" : "preview")}
              size="sm"
              disabled={!draft || draft.html_inline.trim().length <= 0}
            >
              {viewMode === "preview" ? "Voir HTML" : "Voir Prévisualisation"}
            </Button>
            <ZipExportButton draft={draft} edits={edits} assets={assets} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 p-4">
        <div
          className={cn(
            "size-full max-h-[calc(100vh-160px)] overflow-hidden rounded-lg border border-border",
            viewMode !== "preview" && "hidden",
            !storeHydrated && "invisible"
          )}
        >
          <Iframe iframeRef={iframeRef} viewMode={viewMode} />
        </div>
        <div
          className={cn(
            "size-full max-h-[calc(100vh-160px)] overflow-auto rounded-lg border border-border p-3",
            viewMode === "preview" && "hidden"
          )}
        >
          <Code codeMirrorDebounceRef={codeMirrorDebounceRef} latestHtmlRef={latestHtmlRef} />
        </div>
      </div>

      <BlockCustomization
        iframeRef={iframeRef}
        codeMirrorDebounceRef={codeMirrorDebounceRef}
        latestHtmlRef={latestHtmlRef}
      />
    </div>
  );
}
