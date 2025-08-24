"use client";

import { useRef } from "react";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { cn } from "@/lib/utils";
import ZipExportButton from "../ZipExportButton";
import BlockCustomization from "./BlockCustomization";
import Code from "./Code";
import Iframe from "./Iframe";
import ViewModeButton from "./ViewModeButton";

export default function PreviewPane() {
  const viewMode = useDraftStore((s) => s.viewMode);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">{viewMode === "preview" ? "Prévisualisation" : "Code HTML"}</h2>
          <div className="flex gap-2">
            <ViewModeButton />
            <ZipExportButton />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 p-4">
        <div
          className={cn(
            "size-full max-h-[calc(100vh-160px)] overflow-hidden rounded-lg border border-border",
            viewMode !== "preview" && "hidden"
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
          <Code />
        </div>
      </div>

      <BlockCustomization iframeRef={iframeRef} />
    </div>
  );
}
