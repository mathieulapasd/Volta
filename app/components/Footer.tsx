"use client";

import { useDraftStore } from "@/lib/store/useDraftStore";
import ResetBuilderDialog from "./ResetBuilderDialog";

export default function Footer() {
  const currentDraft = useDraftStore((s) => s.draft);

  return (
    <div className="border-border border-t bg-primary px-5 py-2">
      <div className="flex items-center justify-between text-xs text-primary-foreground/60">
        <div className="flex items-center gap-1.5">
          {currentDraft ? (
            <>
              <span className="size-1.5 rounded-full bg-green-500" />
              <span>{currentDraft.manifest.blocks.length} blocs chargés</span>
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-gray-300" />
              <span>Aucun e-mail chargé</span>
            </>
          )}
        </div>
        <ResetBuilderDialog />
      </div>
    </div>
  );
}
