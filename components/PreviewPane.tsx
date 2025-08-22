"use client";

import { html as htmlLang } from "@codemirror/lang-html";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import ZipExportButton from "@/components/ZipExportButton";
import { applyAttributeEditToElement, applyEditsToIframe, sanitizeHtml } from "@/lib/emailEditing";
import type { AttributeName, EditOp, EmailBlock } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

export default function PreviewPane() {
  const draft = useDraftStore((s) => s.draft);
  const edits = useDraftStore((s) => s.edits);
  const assets = useDraftStore((s) => s.assets);
  const upsertEdit = useDraftStore((s) => s.upsertEdit);
  const htmlCode = useDraftStore((s) => s.htmlCode);
  const setHtmlCode = useDraftStore((s) => s.setHtmlCode);

  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editAttribute, setEditAttribute] = useState<AttributeName>("text");
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Apply edits to iframe when they change (only in preview mode)
  useEffect(() => {
    if (viewMode === "preview" && draft && iframeRef.current) {
      applyEditsToIframe(iframeRef.current, edits, assets);
    }
  }, [edits, draft, assets, viewMode]);

  // Set up iframe message handling
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "elementClick") {
        const block = draft?.manifest.blocks.find((b) => b.id === event.data.elementId);

        if (block) {
          setSelectedBlock(block);
          // Get current value from iframe
          const iframe = iframeRef.current;

          if (iframe?.contentDocument) {
            const element = iframe.contentDocument.querySelector(block.selector);

            if (element) {
              if (editAttribute === "text") {
                setEditValue(element.textContent || "");
              } else {
                setEditValue(element.getAttribute(editAttribute) || "");
              }
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [draft, editAttribute]);

  const handleEditSave = () => {
    if (!selectedBlock) {
      return;
    }

    const newEdit: EditOp =
      editAttribute === "text"
        ? { kind: "setText", id: selectedBlock.id, value: sanitizeHtml(editValue) }
        : { kind: "setAttr", id: selectedBlock.id, name: editAttribute, value: sanitizeHtml(editValue) };

    upsertEdit(newEdit);
    setSelectedBlock(null);
  };

  useEffect(() => {
    if (!draft) {
      setHtmlCode(`
      <html>
          <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #666;">
            <h2>Pas de prévisualisation disponible</h2>
            <p>Commencez une conversation pour générer un modèle d'e-mail</p>
          </body>
        </html>`);

      return;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(draft.html_inline, "text/html");

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

      setHtmlCode(doc.documentElement.outerHTML);
    } catch {
      setHtmlCode(draft.html_inline);
    }
  }, [draft, edits, setHtmlCode]);

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
    const script = `
      <script>
        document.addEventListener('mouseover', (e) => {
          const element = e.target.closest('[data-id]');
          if (element) {
            element.style.outline = '2px dashed #3b82f6';
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
            e.preventDefault();
            window.parent.postMessage({ type: 'elementClick', elementId: element.getAttribute('data-id') }, '*');
          }
        });
      </script>
    `;

    const base = htmlCode || draft.html_inline;

    return `${base}${script}`;
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">{viewMode === "preview" ? "Prévisualisation" : "HTML"}</h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "preview" ? "html" : "preview")}
              size="sm"
            >
              {viewMode === "preview" ? "Voir HTML" : "Voir Prévisualisation"}
            </Button>
            <ZipExportButton draft={draft} edits={edits} assets={assets} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 p-4">
        {viewMode === "preview" ? (
          <div className="size-full overflow-hidden rounded-lg border border-border">
            <iframe
              ref={iframeRef}
              srcDoc={getIframeContent()}
              sandbox=""
              className="size-full"
              title="Prévisualisation"
            />
          </div>
        ) : (
          <div className="size-full max-h-[calc(100vh-200px)] overflow-auto rounded-lg border border-border p-3">
            <CodeMirror
              value={htmlCode}
              height="100%"
              extensions={[htmlLang()]}
              onChange={setHtmlCode}
              basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
            />
          </div>
        )}
      </div>

      {/* Edit Popover */}
      {selectedBlock && (
        <Popover open={!!selectedBlock} onOpenChange={() => setSelectedBlock(null)}>
          <PopoverTrigger asChild>
            <div className="hidden" />
          </PopoverTrigger>
          <PopoverContent className="w-80" side="left">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">{selectedBlock.label || selectedBlock.id}</h3>
                <p className="text-muted-foreground text-sm">Type: {selectedBlock.type}</p>
              </div>

              <div className="space-y-2">
                <Label>Modifier la propriété</Label>
                <Select value={editAttribute} onValueChange={(value: AttributeName) => setEditAttribute(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une propriété" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBlock.editable.map((prop) => (
                      <SelectItem key={prop} value={prop}>
                        {prop === "text" ? "Contenu du texte" : prop.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valeur</Label>
                {editAttribute === "text" ? (
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Entrer le texte..."
                    rows={3}
                  />
                ) : (
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={`Entrer ${editAttribute}...`}
                  />
                )}
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleEditSave} size="sm">
                  Sauvegarder
                </Button>
                <Button variant="outline" onClick={() => setSelectedBlock(null)} size="sm">
                  Annuler
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
