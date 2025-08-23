"use client";

import { html as htmlLang } from "@codemirror/lang-html";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import ZipExportButton from "@/components/ZipExportButton";
import { applyAttributeEditToElement, applyEditsToIframe, getCurrentValue, sanitizeHtml } from "@/lib/emailEditing";
import type { AttributeName, EditOp, EmailBlock } from "@/lib/schemas";
import { useDraftStore, type DraftStore } from "@/lib/store/useDraftStore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "@/lib/utils";

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
  const [attrValues, setAttrValues] = useState<Partial<Record<AttributeName, string>>>({});
  const debounceTimersRef = useRef<Record<string, number | undefined>>({});
  const codeMirrorDebounceRef = useRef<number | undefined>(undefined);
  const latestHtmlRef = useRef<string>("");
  const lastComposeKeyRef = useRef<string | null>(null);
  const lastComposedBaseRef = useRef<string | null>(null);
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<"preview" | "html">("preview");
  const [iframeContent, setIframeContent] = useState<string>("");

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Track zustand-persist hydration to avoid showing unedited HTML briefly
  useEffect(() => {
    type PersistHelpers = {
      hasHydrated: () => boolean;
      onFinishHydration?: (cb: (state: DraftStore) => void) => () => void;
    };

    const withPersist = useDraftStore as unknown as { persist?: PersistHelpers };
    const persist = withPersist.persist;

    if (persist && typeof persist.hasHydrated === "function") {
      if (persist.hasHydrated()) {
        setStoreHydrated(true);
      }

      const unsub = persist.onFinishHydration?.(() => {
        setStoreHydrated(true);
      });

      return () => {
        if (typeof unsub === "function") {
          unsub();
        }
      };
    }

    // Fallback: assume hydrated next frame
    const r = window.requestAnimationFrame(() => setStoreHydrated(true));

    return () => window.cancelAnimationFrame(r);
  }, []);

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
          // Get current values from iframe for all editable attributes
          const iframe = iframeRef.current;

          if (iframe?.contentDocument) {
            const element = iframe.contentDocument.querySelector(block.selector);

            if (element) {
              const next: Partial<Record<AttributeName, string>> = {};

              block.editable.forEach((attr) => {
                next[attr] = getCurrentValue(element, attr);
              });
              
              setAttrValues(next);
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [draft, editAttribute]);

  // Debounced attribute updater
  const updateAttributeDebounced = (name: AttributeName, rawValue: string) => {
    const value = sanitizeHtml(rawValue);

    setAttrValues((prev) => ({ ...prev, [name]: value }));

    const key = `${selectedBlock?.id || ""}:${name}`;
    const timers = debounceTimersRef.current;

    if (timers[key]) {
      window.clearTimeout(timers[key]);
    }

    timers[key] = window.setTimeout(() => {
      if (!selectedBlock) {
        return;
      }

      const edit: EditOp =
        name === "text"
          ? { kind: "setText", id: selectedBlock.id, value }
          : { kind: "setAttr", id: selectedBlock.id, name, value };

      upsertEdit(edit);
    }, 200);
  };

  // Flush pending attribute debounce and persist immediately
  const commitAttribute = (name: AttributeName, providedValue?: string) => {
    if (!selectedBlock) {
      return;
    }

    const key = `${selectedBlock.id}:${name}`;
    const timers = debounceTimersRef.current;

    if (timers[key]) {
      window.clearTimeout(timers[key]);
      timers[key] = undefined;
    }

    const raw = providedValue !== undefined ? providedValue : (attrValues[name] || "");
    const value = sanitizeHtml(raw);

    setAttrValues((prev) => ({ ...prev, [name]: value }));

    const edit: EditOp =
      name === "text"
        ? { kind: "setText", id: selectedBlock.id, value }
        : { kind: "setAttr", id: selectedBlock.id, name, value };

    upsertEdit(edit);
  };

  // Ensure debounced edits are saved before tab unload (Sheet + CodeMirror)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedBlock) {
        selectedBlock.editable.forEach((attr) => {
          if (attrValues[attr] !== undefined) {
            commitAttribute(attr);
          }
        });
      }

      if (codeMirrorDebounceRef.current) {
        window.clearTimeout(codeMirrorDebounceRef.current);
        codeMirrorDebounceRef.current = undefined;
      }

      if (latestHtmlRef.current !== undefined) {
        setHtmlCode(latestHtmlRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedBlock, attrValues, setHtmlCode]);

  // Helpers for number + unit fields
  const splitNumberAndUnit = (input: string): { num: string; unit: string } => {
    const match = /^(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw)?$/i.exec(input.trim());

    if (!match) {
      return { num: "", unit: "px" };
    }

    return { num: match[1], unit: (match[2] || "px").toLowerCase() };
  };

  const joinNumberAndUnit = (num: string, unit: string): string => {
    if (!num) {
      return "";
    }

    return `${num}${unit}`;
  };

  const normalizeColor = (value?: string, fallback = "#000000"): string => {
    const v = (value || "").trim();

    if (!v) {
      return fallback;
    }

    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      return v.toLowerCase();
    }

    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      const r = v[1];
      const g = v[2];
      const b = v[3];

      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    const rgb = v.match(/^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0|1|0?\.\d+))?\)$/i);

    if (rgb) {
      const r = Math.max(0, Math.min(255, parseInt(rgb[1], 10))).toString(16).padStart(2, "0");
      const g = Math.max(0, Math.min(255, parseInt(rgb[2], 10))).toString(16).padStart(2, "0");
      const b = Math.max(0, Math.min(255, parseInt(rgb[3], 10))).toString(16).padStart(2, "0");

      return `#${r}${g}${b}`;
    }

    return fallback;
  };

  useEffect(() => {
    if (!draft) {
      if (viewMode === "html") {
        setHtmlCode(`
        <html>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #666;">
              <h2>Pas de prévisualisation disponible</h2>
              <p>Commencez une conversation pour générer un modèle d'e-mail</p>
            </body>
          </html>`);
      } else {
        setHtmlCode("");
      }

      return;
    }

    if (viewMode !== "html") {
      // Avoid regenerating htmlCode while in preview to prevent iframe reload/scroll reset
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
          applyAttributeEditToElement(element, edit, assets);
        }
      });

      setHtmlCode(doc.documentElement.outerHTML);
    } catch {
      setHtmlCode(draft.html_inline);
    }
  }, [draft, edits, setHtmlCode, viewMode]);

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
  };

  // Recompute iframe content when base HTML or edits change
  useEffect(() => {
    setIframeContent(getIframeContent());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, htmlCode, edits]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-border border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-xl">{viewMode === "preview" ? "Prévisualisation" : "Code HTML"}</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === "preview" ? "html" : "preview")}
              size="sm"
              disabled={!draft || draft.html_inline.trim().length <= 0}
            >
              {viewMode === "preview" ? "Voir HTML" : "Voir Prévisualisation"}
            </Button>
            <ZipExportButton draft={draft} edits={edits} assets={assets} />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 p-4">
        <div className={cn("size-full max-h-[calc(100vh-160px)] overflow-hidden rounded-lg border border-border", viewMode !== "preview" && "hidden", !storeHydrated && "invisible")}> 
          <iframe
            ref={iframeRef}
            srcDoc={iframeContent}
            sandbox="allow-scripts allow-same-origin"
            className="size-full"
            title="Prévisualisation"
            onLoad={() => {
              const iframe = iframeRef.current;
              if (iframe && draft) {
                applyEditsToIframe(iframe, edits, assets);
              }
            }}
          />
        </div>
        <div className={cn("size-full max-h-[calc(100vh-160px)] overflow-auto rounded-lg border border-border p-3", viewMode === "preview" && "hidden")}>
          <CodeMirror
            value={htmlCode}
            height="100%"
            extensions={[htmlLang()]}
            onChange={(val) => {
              if (codeMirrorDebounceRef.current) {
                window.clearTimeout(codeMirrorDebounceRef.current);
              }

              latestHtmlRef.current = val;

              codeMirrorDebounceRef.current = window.setTimeout(() => {
                setHtmlCode(val);
              }, 200);
            }}
            basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
          />
        </div>
      </div>

      {/* Edit Sheet */}
      {selectedBlock && (
        <Sheet modal={false} open={!!selectedBlock} onOpenChange={(open) => { if (!open) { if (selectedBlock) { selectedBlock.editable.forEach((attr) => { if (attrValues[attr] !== undefined) { commitAttribute(attr); } }); } setSelectedBlock(null); } }}>
          <SheetContent
            side="right"
            withOverlay={false}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <SheetHeader>
              <SheetTitle>{selectedBlock.label || selectedBlock.id}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 p-4">
              {/* Render controls based on editable attributes */}
              {selectedBlock.editable.includes("text") && (
                <div className="space-y-2">
                  <Label>Contenu</Label>
                  <Textarea
                    value={(attrValues.text || "").replace(/^\s+|\s+$/g, "")}
                    onChange={(e) => updateAttributeDebounced("text", e.target.value)}
                    onBlur={() => commitAttribute("text")}
                    placeholder="Entrer le texte..."
                    rows={4}
                  />
                </div>
              )}

              {selectedBlock.editable.includes("href") && (
                <div className="space-y-2">
                  <Label>Lien</Label>
                  <Input
                    value={attrValues.href || ""}
                    onChange={(e) => updateAttributeDebounced("href", e.target.value)}
                    onBlur={() => commitAttribute("href")}
                    placeholder="https://exemple.com"
                    type="url"
                  />
                </div>
              )}

              {selectedBlock.editable.includes("target") && (
                <div className="space-y-2">
                  <Label>Cible</Label>
                  <Select value={attrValues.target || "_self"} onValueChange={(v) => commitAttribute("target", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_self">Même onglet</SelectItem>
                      <SelectItem value="_blank">Nouvel onglet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBlock.editable.includes("src") && (
                <div className="space-y-2">
                  <Label>Image (src)</Label>
                  <Select value={attrValues.src || ""} onValueChange={(v) => commitAttribute("src", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une image" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.filename}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBlock.editable.includes("alt") && (
                <div className="space-y-2">
                  <Label>Texte alternatif (alt)</Label>
                  <Input
                    value={attrValues.alt || ""}
                    onChange={(e) => updateAttributeDebounced("alt", e.target.value)}
                    onBlur={() => commitAttribute("alt")}
                    placeholder="Description de l'image"
                  />
                </div>
              )}

              {selectedBlock.editable.includes("width") && (
                <div className="space-y-2">
                  <Label>Largeur (px)</Label>
                  <Input
                    type="number"
                    value={attrValues.width || ""}
                    onChange={(e) => updateAttributeDebounced("width", e.target.value)}
                    onBlur={() => commitAttribute("width")}
                    placeholder="Ex: 600"
                  />
                </div>
              )}

              {selectedBlock.editable.includes("height") && (
                <div className="space-y-2">
                  <Label>Hauteur (px)</Label>
                  <Input
                    type="number"
                    value={attrValues.height || ""}
                    onChange={(e) => updateAttributeDebounced("height", e.target.value)}
                    onBlur={() => commitAttribute("height")}
                    placeholder="Ex: 300"
                  />
                </div>
              )}

              {selectedBlock.editable.includes("color") && (
                <div className="space-y-2">
                  <Label>Couleur du texte</Label>
                  <Input
                    type="color"
                    value={normalizeColor(attrValues.color)}
                    onChange={(e) => updateAttributeDebounced("color", e.target.value)}
                    onBlur={() => commitAttribute("color")}
                  />
                </div>
              )}

              {selectedBlock.editable.includes("bgcolor") && (
                <div className="space-y-2">
                  <Label>Couleur de fond</Label>
                  <Input
                    type="color"
                    value={normalizeColor(attrValues.bgcolor, "#ffffff")}
                    onChange={(e) => updateAttributeDebounced("bgcolor", e.target.value)}
                    onBlur={() => commitAttribute("bgcolor")}
                  />
                </div>
              )}

              {selectedBlock.editable.includes("fontWeight") && (
                <div className="space-y-2">
                  <Label>Épaisseur du texte</Label>
                  <Select value={attrValues.fontWeight || ""} onValueChange={(v) => commitAttribute("fontWeight", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="400">Normal</SelectItem>
                      <SelectItem value="500">Moyen</SelectItem>
                      <SelectItem value="600">Semi-gras</SelectItem>
                      <SelectItem value="700">Gras</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBlock.editable.includes("textAlign") && (
                <div className="space-y-2">
                  <Label>Alignement</Label>
                  <Select value={attrValues.textAlign || "left"} onValueChange={(v) => commitAttribute("textAlign", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Gauche</SelectItem>
                      <SelectItem value="center">Centre</SelectItem>
                      <SelectItem value="right">Droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedBlock.editable.includes("fontSize") && (
                <div className="space-y-2">
                  <Label>Taille du texte</Label>
                  {(() => {
                    const { num, unit } = splitNumberAndUnit(attrValues.fontSize || "");

                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={num}
                          onChange={(e) => updateAttributeDebounced("fontSize", joinNumberAndUnit(e.target.value, unit))}
                          onBlur={() => commitAttribute("fontSize")}
                          placeholder="16"
                        />
                        <Select value={unit} onValueChange={(u) => commitAttribute("fontSize", joinNumberAndUnit(num, u))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="em">em</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedBlock.editable.includes("lineHeight") && (
                <div className="space-y-2">
                  <Label>Interligne</Label>
                  {(() => {
                    const { num, unit } = splitNumberAndUnit(attrValues.lineHeight || "");

                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={num}
                          onChange={(e) => updateAttributeDebounced("lineHeight", joinNumberAndUnit(e.target.value, unit))}
                          onBlur={() => commitAttribute("lineHeight")}
                          placeholder="24"
                        />
                        <Select value={unit} onValueChange={(u) => commitAttribute("lineHeight", joinNumberAndUnit(num, u))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="em">em</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedBlock.editable.includes("padding") && (
                <div className="space-y-2">
                  <Label>Padding</Label>
                  {(() => {
                    const { num, unit } = splitNumberAndUnit(attrValues.padding || "");

                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={num}
                          onChange={(e) => updateAttributeDebounced("padding", joinNumberAndUnit(e.target.value, unit))}
                          onBlur={() => commitAttribute("padding")}
                          placeholder="16"
                        />
                        <Select value={unit} onValueChange={(u) => commitAttribute("padding", joinNumberAndUnit(num, u))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="em">em</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedBlock.editable.includes("borderRadius") && (
                <div className="space-y-2">
                  <Label>Rayon de bordure</Label>
                  {(() => {
                    const { num, unit } = splitNumberAndUnit(attrValues.borderRadius || "");

                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={num}
                          onChange={(e) => updateAttributeDebounced("borderRadius", joinNumberAndUnit(e.target.value, unit))}
                          onBlur={() => commitAttribute("borderRadius")}
                          placeholder="6"
                        />
                        <Select value={unit} onValueChange={(u) => commitAttribute("borderRadius", joinNumberAndUnit(num, u))}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="px">px</SelectItem>
                            <SelectItem value="rem">rem</SelectItem>
                            <SelectItem value="em">em</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
