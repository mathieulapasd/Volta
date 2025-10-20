"use client";

import type { ReactElement, RefObject } from "react";
import { useCallback, useEffect, useRef } from "react";
import { getElement, sanitizeHtml } from "@/lib/emailEditing";
import type { EmailBlock } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";

interface InlineEditorProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  request: EmailBlock | null;
  onFinish: () => void;
}

export default function InlineEditor(props: InlineEditorProps): ReactElement | null {
  const updateDraftHtml = useDraftStore((s) => s.updateDraftHtml);

  const originalHtmlRef = useRef<string>("");
  const activeSelectorRef = useRef<string | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);

  const commitToDraft = useCallback(() => {
    const iframe = props.iframeRef.current;

    if (!iframe) {
      return;
    }

    const html = iframe.contentWindow?.document.documentElement.outerHTML;

    if (!html) {
      return;
    }

    updateDraftHtml(html);
  }, [props.iframeRef, updateDraftHtml]);

  const setCaretToEnd = useCallback((el: HTMLElement) => {
    try {
      const doc = el.ownerDocument;
      const range = doc.createRange();
      range.selectNodeContents(el);
      range.collapse(false);

      const sel = doc.getSelection();

      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch {
      // ignore
    }
  }, []);

  const endEditing = useCallback(
    (commit: boolean) => {
      const selector = activeSelectorRef.current;
      const el = activeElementRef.current;

      if (!selector || !el) {
        props.onFinish();

        return;
      }

      // Remove editing affordances before serializing
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
      el.style.outline = "";
      el.style.outlineOffset = "";
      el.style.cursor = "";

      if (commit) {
        const raw = el.innerHTML;
        const sanitized = sanitizeHtml(raw).trim();

        el.innerHTML = sanitized;
        commitToDraft();
      } else if (!commit) {
        el.innerHTML = originalHtmlRef.current;
      }

      originalHtmlRef.current = "";
      activeSelectorRef.current = null;
      activeElementRef.current = null;
      props.onFinish();
    },
    [props, commitToDraft]
  );

  // Initialize editing session
  useEffect(() => {
    if (!props.request || !props.request.editable.includes("text")) {
      return;
    }

    const iframe = props.iframeRef.current;

    if (!iframe) {
      return;
    }

    const el = getElement(iframe, props.request.selector) as HTMLElement | null;

    if (!el) {
      return;
    }

    originalHtmlRef.current = el.innerHTML;
    activeSelectorRef.current = props.request.selector;
    activeElementRef.current = el;

    // Make element editable without visual changes
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
    el.style.cursor = "text";

    // Focus and place caret at end
    setTimeout(() => {
      try {
        el.focus();
        setCaretToEnd(el);
      } catch {
        // ignore
      }
    }, 0);

    // Keyboard shortcuts within the iframe document
    const ownerDoc = iframe.contentDocument || iframe.contentWindow?.document;

    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        endEditing(false);

        return;
      }

      if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
        ev.preventDefault();
        ev.stopPropagation();
        endEditing(true);

        return;
      }

      // Formatting shortcuts
      if ((ev.metaKey || ev.ctrlKey) && (ev.key === "b" || ev.key === "B")) {
        ev.preventDefault();
        try {
          ownerDoc?.execCommand?.("bold", false);
        } catch {
          // ignore
        }

        return;
      }

      if ((ev.metaKey || ev.ctrlKey) && (ev.key === "i" || ev.key === "I")) {
        ev.preventDefault();
        try {
          ownerDoc?.execCommand?.("italic", false);
        } catch {
          // ignore
        }
      }
    };

    const onBlur = () => {
      endEditing(true);
    };

    el.addEventListener("keydown", onKeyDown as unknown as EventListener, { capture: true });
    el.addEventListener("blur", onBlur as unknown as EventListener, { capture: true });

    return () => {
      try {
        el.removeEventListener(
          "keydown",
          onKeyDown as unknown as EventListener,
          { capture: true } as AddEventListenerOptions
        );
        el.removeEventListener(
          "blur",
          onBlur as unknown as EventListener,
          { capture: true } as AddEventListenerOptions
        );
      } catch {
        // ignore
      }
    };
  }, [props.request, props.iframeRef, endEditing, setCaretToEnd]);
  if (!props.request) {
    return null;
  }

  return null;
}
