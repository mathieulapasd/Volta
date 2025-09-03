"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { createEmailZip, estimateZipSize } from "@/lib/zip";

export default function ZipExportButton() {
  const draft = useDraftStore((s) => s.draft);

  const [isExporting, setIsExporting] = useState(false);

  const canExport = draft && draft.html_inline.trim().length > 0;

  const estimatedSize = canExport ? estimateZipSize(draft) : 0;
  const formattedSize =
    estimatedSize > 1024 * 1024
      ? `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.ceil(estimatedSize / 1024)} KB`;

  const handleExport = async () => {
    if (!canExport) {
      return;
    }

    setIsExporting(true);

    try {
      const zipBlob = await createEmailZip(draft);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "email-template.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);

      toast.error("Échec de l'exportation du modèle d'e-mail");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={!canExport} variant="outline" size="sm">
      {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
      Exporter ZIP
      {canExport && (
        <Badge variant="secondary" className="text-xs">
          {formattedSize}
        </Badge>
      )}
    </Button>
  );
}
