import DOMPurify from "dompurify";
import type { EditOp, EmailAsset } from "./schemas";

export function applyAttributeEditToElement(element: Element, edit: Extract<EditOp, { kind: "setAttr" }>, assets?: EmailAsset[]): void {
  if (edit.name === "src" && element.tagName === "IMG" && assets) {
    const asset = assets.find((a) => a.source === edit.value || a.id === edit.value);

    if (asset) {
      element.setAttribute("src", asset.source);

      if (asset.alt) {
        element.setAttribute("alt", asset.alt);
      }

      if (asset.width) {
        element.setAttribute("width", asset.width.toString());
      }

      if (asset.height) {
        element.setAttribute("height", asset.height.toString());
      }

      return;
    }
  }

  if (edit.name === "bgcolor") {
    const currentStyle = element.getAttribute("style") || "";
    const newStyle = `${currentStyle.replace(/background-color:[^;]*;?/g, "")}background-color: ${edit.value};`;
    element.setAttribute("style", newStyle);

    return;
  }

  if (edit.name === "color") {
    const currentStyle = element.getAttribute("style") || "";
    const newStyle = `${currentStyle.replace(/color:[^;]*;?/g, "")}color: ${edit.value};`;
    element.setAttribute("style", newStyle);

    return;
  }

  element.setAttribute(edit.name, edit.value);
}

// Sanitize HTML content with a whitelist of safe attributes
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p", "span", "div"],
    ALLOWED_ATTR: ["href", "target", "style", "color", "bgcolor", "src", "alt", "width", "height"],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

// Apply edits to the iframe document
export function applyEditsToIframe(iframe: HTMLIFrameElement, edits: EditOp[], assets: EmailAsset[]): void {
  const doc = iframe.contentDocument;
  
  if (!doc) return;

  edits.forEach((edit) => {
    const element = doc.querySelector(`[data-id="${edit.id}"]`);
    if (!element) return;

    if (edit.kind === "setText") {
      element.textContent = edit.value;
    } else if (edit.kind === "setAttr") {
      applyAttributeEditToElement(element, edit, assets);
    }
  });
}

// Get current value from an element for editing
export function getCurrentValue(element: Element, attribute: string): string {
  if (attribute === "text") {
    return element.textContent || "";
  }
  if (attribute === "bgcolor") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/background-color:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }
  if (attribute === "color") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/color:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }

  return element.getAttribute(attribute) || "";
}
