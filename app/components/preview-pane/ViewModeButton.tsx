"use client";

import { Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDraftStore } from "@/lib/store/useDraftStore";

export default function ViewModeButton() {
  const draft = useDraftStore((s) => s.draft);
  const viewMode = useDraftStore((s) => s.viewMode);
  const setViewMode = useDraftStore((s) => s.setViewMode);

  return (
    <Button
      variant="outline"
      onClick={() => setViewMode(viewMode === "preview" ? "html" : "preview")}
      size="sm"
      disabled={!draft || draft.html_inline.trim().length <= 0}
    >
      <Code />
      {viewMode === "preview" ? "Voir HTML" : "Voir Prévisualisation"}
    </Button>
  );
}
