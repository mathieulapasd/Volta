import JSZip from "jszip";
import type { EmailDraft } from "./schemas";

export function estimateZipSize(draft: EmailDraft): number {
  const size = draft.html_inline.length; // HTML size

  return Math.ceil(size * 1.2); // Add 20% overhead for ZIP compression
}

// Create a ZIP file with the email template and assets
export async function createEmailZip(draft: EmailDraft): Promise<Blob> {
  const zip = new JSZip();

  // Apply edits to HTML
  let finalHtml = draft.html_inline;

  // Create a temporary DOM to apply edits
  const parser = new DOMParser();
  const doc = parser.parseFromString(finalHtml, "text/html");

  finalHtml = doc.documentElement.outerHTML;

  // Add index.html
  zip.file("index.html", finalHtml);

  // Add manifest.json
  const manifest = {
    blocks: draft.manifest.blocks,
    generated_at: new Date().toISOString(),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  // Generate ZIP
  return await zip.generateAsync({ type: "blob" });
}
