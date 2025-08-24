import JSZip from "jszip";
import { applyAttributeEditToElement } from "./emailEditing";
import type { EditOp, EmailAsset, EmailDraft } from "./schemas";

export function estimateZipSize(draft: EmailDraft): number {
  let size = draft.html_inline.length; // HTML size

  draft.assets.forEach((asset) => {
    if (asset.source.startsWith("data:")) {
      // Rough estimate: base64 is ~1.37x larger than binary
      const base64Data = asset.source.split(",")[1];

      size += base64Data ? base64Data.length * 0.73 : 0;
    } else {
      // Estimate for remote images (rough guess)
      size += 100 * 1024; // 100KB per remote image
    }
  });

  return Math.ceil(size * 1.2); // Add 20% overhead for ZIP compression
}

// Create a ZIP file with the email template and assets
export async function createEmailZip(draft: EmailDraft, edits: EditOp[], assets: EmailAsset[]): Promise<Blob> {
  const zip = new JSZip();

  // Apply edits to HTML
  let finalHtml = draft.html_inline;

  // Create a temporary DOM to apply edits
  const parser = new DOMParser();
  const doc = parser.parseFromString(finalHtml, "text/html");

  edits.forEach((edit) => {
    const element = doc.querySelector(`[data-id="${edit.id}"]`);

    if (!element) {
      return;
    }

    if (edit.kind === "setText") {
      element.textContent = edit.value;
    } else if (edit.kind === "setAttr") {
      applyAttributeEditToElement(element, edit);
    }
  });

  finalHtml = doc.documentElement.outerHTML;

  // Process assets and update HTML
  const cidMap: Record<string, string> = {};
  const imagesFolder = zip.folder("images");

  for (const asset of assets) {
    const cid = asset.id;

    cidMap[asset.filename] = cid;

    // Convert data URLs to binary data
    if (asset.source.startsWith("data:")) {
      const [, data] = asset.source.split(",");
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      imagesFolder?.file(asset.filename, bytes);
    } else {
      // For remote URLs, we'd need to fetch them
      // For now, just create a placeholder
      imagesFolder?.file(asset.filename, "Remote image placeholder");
    }

    // Update HTML to use CID references
    finalHtml = finalHtml.replace(new RegExp(asset.source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `cid:${cid}`);
  }

  // Add index.html
  zip.file("index.html", finalHtml);

  // Add manifest.json
  const manifest = {
    cid_map: cidMap,
    blocks: draft.manifest.blocks,
    generated_at: new Date().toISOString(),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // Generate ZIP
  return await zip.generateAsync({ type: "blob" });
}
