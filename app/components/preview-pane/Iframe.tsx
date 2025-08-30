"use client";

import { type RefObject, useEffect } from "react";
import { fontToCssMap } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";

interface IframeProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  viewMode: "preview" | "html";
}

export default function Iframe(props: IframeProps) {
  const draft = useDraftStore((s) => s.draft);

  useEffect(() => {
    const iframe = props.iframeRef.current;

    if (!iframe || !draft?.html_inline) {
      return;
    }

    const attach = (): (() => void) | undefined => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;

      if (!doc) {
        return;
      }

      const defaultFont = fontToCssMap[draft.config.font];

      if (!doc.documentElement.hasAttribute("data-default-font-applied")) {
        doc.documentElement.setAttribute("data-default-font-applied", "1");

        if (doc.body) {
          doc.body.style.setProperty("font-family", defaultFont);
          doc.documentElement.style.setProperty("--primary", draft.config.primaryColor);
        }
      }

      const ac = new AbortController();

      const onOver = (e: Event) => {
        const t = e.target as Element | null;
        const el = t?.closest?.("[data-id]") as HTMLElement | null;

        if (!el) {
          return;
        }

        // Use box-shadow so we don't overwrite border-radius.
        el.style.outline = "2px solid #3b82f6";
        el.style.outlineOffset = "2px";
        el.style.cursor = "pointer";

        window.postMessage(
          {
            type: "elementHover",
            elementId: el.getAttribute("data-id"),
          },
          "*"
        );
      };

      const onOut = (e: Event) => {
        const t = e.target as Element | null;
        const el = t?.closest?.("[data-id]") as HTMLElement | null;

        if (!el) {
          return;
        }

        el.style.outline = "none";
        el.style.outlineOffset = "0px";
        el.style.cursor = "default";
      };

      const onClick = (e: Event) => {
        const t = e.target as Element | null;
        const el = t?.closest?.("[data-id]") as HTMLElement | null;

        if (!el) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        window.postMessage(
          {
            type: "elementClick",
            elementId: el.getAttribute("data-id"),
          },
          "*"
        );
      };

      // Capture phase for robustness in nested structures.
      const opts = { capture: true, signal: ac.signal } as AddEventListenerOptions;

      doc.addEventListener("mouseover", onOver, opts);
      doc.addEventListener("mouseout", onOut, opts);
      doc.addEventListener("click", onClick, opts);

      // Cleanup for all three listeners in one call.
      return () => {
        ac.abort();
      };
    };

    let detachDoc: (() => void) | undefined;

    const onLoad = () => {
      // If the iframe reloads, drop old listeners before reattaching.
      if (detachDoc) {
        detachDoc();
      }

      detachDoc = attach();
    };

    // If the document is already ready, attach immediately; also listen for future loads.
    if (iframe.contentDocument?.readyState === "complete") {
      detachDoc = attach();
    }

    iframe.addEventListener("load", onLoad);

    return () => {
      iframe.removeEventListener("load", onLoad);

      if (detachDoc) {
        detachDoc();
        detachDoc = undefined;
      }
    };
  }, [props.iframeRef, draft?.html_inline, draft?.config]);

  const getIframeContent = () => {
    if (!draft) {
      return `
      <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #666;">
            <h2>Pas de prévisualisation disponible</h2>
            <p>Commencez une conversation pour générer un modèle d'e-mail</p>
          </body>
        </html>`;
    }

    return draft.html_inline;
  };

  return (
    <iframe
      ref={props.iframeRef}
      srcDoc={getIframeContent()}
      sandbox="allow-scripts allow-same-origin"
      className="size-full"
      title="Prévisualisation"
    />
  );
}
