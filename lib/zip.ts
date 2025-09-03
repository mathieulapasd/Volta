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

  // Rewrite any data URLs in <img src> that match stored assets to relative images/ paths
  const imagesFolder = zip.folder("images");

  const imgs = Array.from(doc.querySelectorAll("img[src]")) as HTMLImageElement[];

  imgs.forEach((img) => {
    const src = img.getAttribute("src") || "";

    if (src.startsWith("data:")) {
      // Try to find a matching asset by comparing dataUrl prefixes to avoid huge string equality
      const asset = draft.assets?.find((a) => src.startsWith(a.dataUrl.slice(0, Math.min(64, a.dataUrl.length))));

      if (asset) {
        img.setAttribute("src", `images/${asset.filename}`);

        const base64 = asset.dataUrl.split(",")[1] || "";

        if (base64 && imagesFolder) {
          imagesFolder.file(asset.filename, base64, { base64: true, date: new Date() });
        }
      }
    } else if (/^images\//i.test(src)) {
      // If already a relative image, include it when we have the asset
      const filename = src.replace(/^images\//i, "");
      const asset = draft.assets?.find((a) => a.filename === filename);

      if (asset && imagesFolder) {
        const base64 = asset.dataUrl.split(",")[1] || "";

        if (base64) {
          imagesFolder.file(asset.filename, base64, { base64: true, date: new Date() });
        }
      }
    }
  });

  // Strip interactive inline styles introduced during preview (outline, outline-offset, cursor)
  const stylePropsToRemove = new Set(["outline", "outline-offset", "cursor"]);
  const elementsWithStyle = Array.from(doc.querySelectorAll<HTMLElement>("[style]"));

  elementsWithStyle.forEach((el) => {
    const style = el.getAttribute("style") || "";
    const rules = style
      .split(";")
      .map((r) => r.trim())
      .filter(Boolean);

    const keptRules: string[] = [];

    rules.forEach((rule) => {
      const idx = rule.indexOf(":");

      if (idx === -1) {
        return;
      }

      const name = rule.slice(0, idx).trim().toLowerCase();

      if (!stylePropsToRemove.has(name)) {
        keptRules.push(rule);
      }
    });

    if (keptRules.length > 0) {
      el.setAttribute("style", keptRules.join("; "));
    } else {
      el.removeAttribute("style");
    }
  });

  // Remove internal data attributes used only for the editor
  const dataElements = Array.from(doc.querySelectorAll("[data-id], [data-default-font-applied]"));

  dataElements.forEach((el) => {
    if (el.hasAttribute("data-id")) {
      el.removeAttribute("data-id");
    }
    if (el.hasAttribute("data-default-font-applied")) {
      el.removeAttribute("data-default-font-applied");
    }
  });

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
