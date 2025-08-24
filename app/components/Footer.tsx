"use client";

import { useDraftStore } from "@/lib/store/useDraftStore";
import ResetBuilderDialog from "./ResetBuilderDialog";

export default function Footer() {
  const currentDraft = useDraftStore((s) => s.draft);

  return (
    <div className="border-gray-200 border-t bg-gray-50 px-6 py-2 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between text-gray-600 text-sm dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>
            {currentDraft ? (
              <>
                <span className="text-green-600 dark:text-green-400">●</span>
                E-mail chargé avec {currentDraft.manifest.blocks.length} blocs modifiables
              </>
            ) : (
              <>
                <span className="text-gray-400">○</span>
                Aucun e-mail chargé
              </>
            )}
          </span>
        </div>

        <ResetBuilderDialog />
      </div>
    </div>
  );
}
