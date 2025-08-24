"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { applyAttributeEditToElement, applyEditsToIframe } from "@/lib/emailEditing";
import { useDraftStore } from "@/lib/store/useDraftStore";

interface IframeProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  viewMode: "preview" | "html";
}

export default function Iframe(props: IframeProps) {
  const draft = useDraftStore((s) => s.draft);
  const edits = useDraftStore((s) => s.edits);
  const assets = useDraftStore((s) => s.assets);
  const htmlCode = useDraftStore((s) => s.htmlCode);

  const [iframeContent, setIframeContent] = useState("");

  const lastComposeKeyRef = useRef<string | null>(null);
  const lastComposedBaseRef = useRef<string | null>(null);

  const onIframeLoad = () => {
    const iframe = props.iframeRef.current;

    if (iframe && draft) {
      applyEditsToIframe(iframe, edits, assets);
    }
  };

  const getIframeContent = useCallback(() => {
    if (!draft) {
      return `
      <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #666;">
            <h2>Pas de prévisualisation disponible</h2>
            <p>Commencez une conversation pour générer un modèle d'e-mail</p>
          </body>
        </html>`;
    }

    // Inject hover/click handling script
    const scriptTag = `
<script>
  (function() {
    document.addEventListener('mouseover', (e) => {
      const element = e.target.closest('[data-id]');
      if (element) {
        element.style.outline = '2px solid #3b82f6';
        element.style.borderRadius = '6px';
        element.style.cursor = 'pointer';
        window.parent.postMessage({ type: 'elementHover', elementId: element.getAttribute('data-id') }, '*');
      }
    });
    
    document.addEventListener('mouseout', (e) => {
      const element = e.target.closest('[data-id]');
      if (element) {
        element.style.outline = 'none';
        element.style.cursor = 'default';
      }
    });
    
    document.addEventListener('click', (e) => {
      const element = e.target.closest('[data-id]');
      if (element) {
        // Avoid triggering default navigation, but don't synthesize a click feel
        e.preventDefault();
        e.stopPropagation();
        window.parent.postMessage({ type: 'elementClick', elementId: element.getAttribute('data-id') }, '*');
      }
    });
  })();
</script>`;

    const rawBase = htmlCode || draft.html_inline;

    const editsSig = edits
      .map((e) => (e.kind === "setText" ? `t:${e.id}:${e.value}` : `a:${e.id}:${e.name}:${e.value}`))
      .join("|");

    const composeKey = `${rawBase.length}:${editsSig}`;

    if (lastComposeKeyRef.current !== composeKey) {
      lastComposeKeyRef.current = composeKey;

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawBase, "text/html");

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

        lastComposedBaseRef.current = doc.documentElement.outerHTML;
      } catch {
        lastComposedBaseRef.current = rawBase;
      }
    }

    const base = lastComposedBaseRef.current || rawBase;

    if (/<\/body>/i.test(base)) {
      return base.replace(/<\/body>/i, `${scriptTag}</body>`);
    }

    return `${base}${scriptTag}`;
  }, [draft, htmlCode, edits, assets]);

  // Recompute iframe content when base HTML or edits change
  useEffect(() => {
    setIframeContent(getIframeContent());
  }, [getIframeContent]);

  // Apply edits to iframe when they change (only in preview mode)
  useEffect(() => {
    if (props.viewMode === "preview" && draft && props.iframeRef.current) {
      applyEditsToIframe(props.iframeRef.current, edits, assets);
    }
  }, [edits, draft, assets, props.viewMode, props.iframeRef]);

  return (
    <iframe
      ref={props.iframeRef}
      srcDoc={iframeContent}
      sandbox="allow-scripts allow-same-origin"
      className="size-full"
      title="Prévisualisation"
      onLoad={onIframeLoad}
    />
  );
}
