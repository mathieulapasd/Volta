"use client";

import type { RefObject } from "react";
import { useDraftStore } from "@/lib/store/useDraftStore";

interface IframeProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  viewMode: "preview" | "html";
}

export default function Iframe(props: IframeProps) {
  const draft = useDraftStore((s) => s.draft);

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

    const rawBase = draft.html_inline;

    if (/<\/body>/i.test(rawBase)) {
      return rawBase.replace(/<\/body>/i, `${scriptTag}</body>`);
    }

    return `${rawBase}${scriptTag}`;
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
