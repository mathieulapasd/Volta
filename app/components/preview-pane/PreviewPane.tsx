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
      <div className="flex h-15 items-center justify-end border-border border-b bg-primary px-4">
        <div className="flex gap-2">
          <ViewModeButton />
          <ZipExportButton />
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
