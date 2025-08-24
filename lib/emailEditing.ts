import DOMPurify from "dompurify";
import type { EditOp, EmailAsset } from "./schemas";

function readStyleMap(element: Element): Map<string, string> {
  const styleAttr = element.getAttribute("style") || "";
  const map = new Map<string, string>();

  styleAttr
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const idx = pair.indexOf(":");

      if (idx === -1) {
        return;
      }

      const key = pair.slice(0, idx).trim().toLowerCase();
      const value = pair.slice(idx + 1).trim();

      map.set(key, value);
    });

  return map;
}

function writeStyleMap(element: Element, map: Map<string, string>): void {
  const style = Array.from(map.entries())
    .map(([k, v]) => `${k}: ${v};`)
    .join("");

  element.setAttribute("style", style);
}

export function applyAttributeEditToElement(
  element: Element,
  edit: Extract<EditOp, { kind: "setAttr" }>,
  assets?: EmailAsset[]
): void {
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
    // For links inside table cells, background is often applied to the parent TD
    const target: Element = element.tagName === "A" && element.parentElement ? element.parentElement : element;
    const map = readStyleMap(target);

    map.set("background-color", edit.value);
    writeStyleMap(target, map);

    return;
  }

  if (edit.name === "color") {
    const map = readStyleMap(element);

    map.set("color", edit.value);
    writeStyleMap(element, map);

    return;
  }

  if (edit.name === "fontSize") {
    const map = readStyleMap(element);

    map.set("font-size", edit.value);
    writeStyleMap(element, map);

    return;
  }

  if (edit.name === "fontWeight") {
    const map = readStyleMap(element);

    map.set("font-weight", edit.value);
    writeStyleMap(element, map);

    return;
  }

  if (edit.name === "textAlign") {
    // Align the button element itself, not the text inside
    const cell: Element | null = element.closest("td");

    if (cell) {
      const cellMap = readStyleMap(cell);

      cellMap.set("text-align", edit.value);
      writeStyleMap(cell, cellMap);
      // Also set legacy align attribute for better email client support
      (cell as HTMLElement).setAttribute("align", edit.value);
    }

    if (element.tagName === "A") {
      const linkMap = readStyleMap(element);

      linkMap.set("display", "inline-block");
      // Do not change text-align of the anchor's content; rely on cell alignment
      // Ensure margins are reset to avoid overriding cell alignment
      linkMap.delete("margin-left");
      linkMap.delete("margin-right");
      writeStyleMap(element, linkMap);
    }

    return;
  }

  if (edit.name === "lineHeight") {
    const map = readStyleMap(element);

    map.set("line-height", edit.value);
    writeStyleMap(element, map);

    return;
  }

  if (edit.name === "padding") {
    const map = readStyleMap(element);

    map.set("padding", edit.value);
    writeStyleMap(element, map);

    return;
  }

  if (edit.name === "borderRadius") {
    // For CTA buttons, the visual rounded rect is on the wrapping TD
    const target: Element = element.tagName === "A" && element.parentElement ? element.parentElement : element;
    const map = readStyleMap(target);

    map.set("border-radius", edit.value);
    writeStyleMap(target, map);

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

  if (!doc) {
    return;
  }

  edits.forEach((edit) => {
    const element = doc.querySelector(`[data-id="${edit.id}"]`);

    if (!element) {
      return;
    }

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
    return (element.textContent || "").trim();
  }
  if (attribute === "bgcolor") {
    const target: Element = element.tagName === "A" && element.parentElement ? element.parentElement : element;
    const style = target.getAttribute("style") || "";
    const match = style.match(/background-color:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }
  if (attribute === "color") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/color:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }

  if (attribute === "fontSize") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/font-size:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }

  if (attribute === "fontWeight") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/font-weight:\s*([^;]+)/);

    let val = match ? match[1].trim() : "";
    if (!val) {
      // Fallback to computed style in iframe when inline not set
      const ownerDoc = element.ownerDocument as Document | null;
      const win = ownerDoc?.defaultView;

      if (win) {
        try {
          const comp = win.getComputedStyle(element as HTMLElement);
          val = comp.fontWeight || "";
        } catch {
          // ignore
        }
      }
    }
    // Normalize keywords to numeric
    if (/^bold$/i.test(val)) {
      return "700";
    }
    if (/^normal$/i.test(val)) {
      return "400";
    }

    return val;
  }

  if (attribute === "textAlign") {
    const target: Element = element.parentElement?.tagName === "TD" ? element.parentElement : element;
    const style = target.getAttribute("style") || "";
    const match = style.match(/text-align:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }

  if (attribute === "lineHeight") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/line-height:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }

  if (attribute === "padding") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/padding:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }

  if (attribute === "borderRadius") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/border-radius:\s*([^;]+)/);

    return match ? match[1].trim() : "";
  }

  return element.getAttribute(attribute) || "";
}
