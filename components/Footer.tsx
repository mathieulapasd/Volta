"use client";

import ResetBuilderDialog from "@/components/ResetBuilderDialog";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

export default function Footer() {
  const currentDraft = useDraftStore((s) => s.draft);
  const edits = useDraftStore((s) => s.edits);
  const assets = useDraftStore((s) => s.assets);

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

          {edits.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span>
                {edits.length} modification{edits.length !== 1 ? "s" : ""} non sauvegardée
                {edits.length !== 1 ? "s" : ""}
              </span>
            </>
          )}

          {assets.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <span>
                {assets.length} asset{assets.length !== 1 ? "s" : ""} chargé{assets.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Modèles d'e-mail prêts pour la production avec support CID</span>
          <Badge variant="outline" className="text-xs">
            v0.1.0
          </Badge>
          <ResetBuilderDialog />
        </div>
      </div>
    </div>
  );
}
