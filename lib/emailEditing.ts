import DOMPurify from "dompurify";

// Sanitize HTML content with a whitelist of safe attributes
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p", "span", "div"],
    ALLOWED_ATTR: ["href", "target", "style", "color", "bgcolor", "src", "alt", "width", "height"],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export function getElement(iframe: HTMLIFrameElement | null, selector: string): Element | null {
  if (!iframe?.contentDocument) {
    return null;
  }

  return iframe.contentDocument.querySelector(selector);
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

  if (attribute === "width") {
    const attr = element.getAttribute("width");

    if (attr && /^\d+(?:\.\d+)?$/i.test(attr.trim())) {
      return attr.trim();
    }

    const style = element.getAttribute("style") || "";
    const match = style.match(/width:\s*([^;]+)/i);

    if (match) {
      const raw = match[1].trim();
      const numeric = raw.match(/^(\d+(?:\.\d+)?)(?:px)?$/i);

      return numeric ? numeric[1] : raw;
    }

    const ownerDoc = (element as Element).ownerDocument as Document | null;
    const win = ownerDoc?.defaultView;

    if (win) {
      try {
        const computed = win.getComputedStyle(element as HTMLElement).width;
        const m = computed.match(/^(\d+(?:\.\d+)?)px$/i);

        return m ? m[1] : computed;
      } catch {
        // ignore
      }
    }

    return "";
  }

  if (attribute === "height") {
    const attr = element.getAttribute("height");

    if (attr && /^\d+(?:\.\d+)?$/i.test(attr.trim())) {
      return attr.trim();
    }

    const style = element.getAttribute("style") || "";
    const match = style.match(/height:\s*([^;]+)/i);

    if (match) {
      const raw = match[1].trim();
      const numeric = raw.match(/^(\d+(?:\.\d+)?)(?:px)?$/i);

      return numeric ? numeric[1] : raw;
    }

    const ownerDoc = (element as Element).ownerDocument as Document | null;
    const win = ownerDoc?.defaultView;

    if (win) {
      try {
        const computed = win.getComputedStyle(element as HTMLElement).height;
        const m = computed.match(/^(\d+(?:\.\d+)?)px$/i);

        return m ? m[1] : computed;
      } catch {
        // ignore
      }
    }

    return "";
  }

  if (attribute === "alt") {
    return element.getAttribute("alt") || "";
  }

  if (attribute === "fontStyle") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/font-style:\s*([^;]+)/);
    return match ? match[1].trim() : "normal";
  }

  if (attribute === "textDecoration") {
    const style = element.getAttribute("style") || "";
    const match = style.match(/text-decoration:\s*([^;]+)/);
    return match ? match[1].trim() : "none";
  }

  return element.getAttribute(attribute) || "";
}
