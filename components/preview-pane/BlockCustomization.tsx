"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { getCurrentValue, sanitizeHtml } from "@/lib/emailEditing";
import type { AttributeName, EditOp, EmailBlock } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet";
import { Textarea } from "../ui/textarea";

interface BlockCustomizationContentProps {
  selectedBlock: EmailBlock;
  attrValues: Partial<Record<AttributeName, string>>;
  updateAttributeDebounced: (name: AttributeName, rawValue: string) => void;
  commitAttribute: (name: AttributeName, providedValue?: string) => void;
}

function BlockCustomizationContent(props: BlockCustomizationContentProps) {
  const assets = useDraftStore((s) => s.assets);

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
      const r = Math.max(0, Math.min(255, Number.parseInt(rgb[1], 10)))
        .toString(16)
        .padStart(2, "0");
      const g = Math.max(0, Math.min(255, Number.parseInt(rgb[2], 10)))
        .toString(16)
        .padStart(2, "0");
      const b = Math.max(0, Math.min(255, Number.parseInt(rgb[3], 10)))
        .toString(16)
        .padStart(2, "0");

      return `#${r}${g}${b}`;
    }

    return fallback;
  };

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

  return (
    <SheetContent side="right" withOverlay={false} onPointerDownOutside={(e) => e.preventDefault()}>
      <SheetHeader>
        <SheetTitle>{props.selectedBlock.label || props.selectedBlock.id}</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 overflow-y-auto p-4">
        {/* Render controls based on editable attributes */}
        {props.selectedBlock.editable.includes("text") && (
          <div className="space-y-2">
            <Label>Contenu</Label>
            <Textarea
              value={(props.attrValues.text || "").replace(/^\s+|\s+$/g, "")}
              onChange={(e) => props.updateAttributeDebounced("text", e.target.value)}
              onBlur={() => props.commitAttribute("text")}
              placeholder="Entrer le texte..."
              rows={4}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("href") && (
          <div className="space-y-2">
            <Label>Lien</Label>
            <Input
              value={props.attrValues.href || ""}
              onChange={(e) => props.updateAttributeDebounced("href", e.target.value)}
              onBlur={() => props.commitAttribute("href")}
              placeholder="https://exemple.com"
              type="url"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("target") && (
          <div className="space-y-2">
            <Label>Cible</Label>
            <Select
              value={props.attrValues.target || "_self"}
              onValueChange={(v) => props.commitAttribute("target", v)}
            >
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

        {props.selectedBlock.editable.includes("src") && (
          <div className="space-y-2">
            <Label>Image (src)</Label>
            <Select value={props.attrValues.src || ""} onValueChange={(v) => props.commitAttribute("src", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une image" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {props.selectedBlock.editable.includes("alt") && (
          <div className="space-y-2">
            <Label>Texte alternatif (alt)</Label>
            <Input
              value={props.attrValues.alt || ""}
              onChange={(e) => props.updateAttributeDebounced("alt", e.target.value)}
              onBlur={() => props.commitAttribute("alt")}
              placeholder="Description de l'image"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("width") && (
          <div className="space-y-2">
            <Label>Largeur (px)</Label>
            <Input
              type="number"
              value={props.attrValues.width || ""}
              onChange={(e) => props.updateAttributeDebounced("width", e.target.value)}
              onBlur={() => props.commitAttribute("width")}
              placeholder="Ex: 600"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("height") && (
          <div className="space-y-2">
            <Label>Hauteur (px)</Label>
            <Input
              type="number"
              value={props.attrValues.height || ""}
              onChange={(e) => props.updateAttributeDebounced("height", e.target.value)}
              onBlur={() => props.commitAttribute("height")}
              placeholder="Ex: 300"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("color") && (
          <div className="space-y-2">
            <Label>Couleur du texte</Label>
            <Input
              type="color"
              value={normalizeColor(props.attrValues.color)}
              onChange={(e) => props.updateAttributeDebounced("color", e.target.value)}
              onBlur={() => props.commitAttribute("color")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("bgcolor") && (
          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <Input
              type="color"
              value={normalizeColor(props.attrValues.bgcolor, "#ffffff")}
              onChange={(e) => props.updateAttributeDebounced("bgcolor", e.target.value)}
              onBlur={() => props.commitAttribute("bgcolor")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("fontWeight") && (
          <div className="space-y-2">
            <Label>Épaisseur du texte</Label>
            <Select
              value={props.attrValues.fontWeight || ""}
              onValueChange={(v) => props.commitAttribute("fontWeight", v)}
            >
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

        {props.selectedBlock.editable.includes("textAlign") && (
          <div className="space-y-2">
            <Label>Alignement</Label>
            <Select
              value={props.attrValues.textAlign || "left"}
              onValueChange={(v) => props.commitAttribute("textAlign", v)}
            >
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

        {props.selectedBlock.editable.includes("fontSize") && (
          <div className="space-y-2">
            <Label>Taille du texte</Label>
            {(() => {
              const { num, unit } = splitNumberAndUnit(props.attrValues.fontSize || "");

              return (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={num}
                    onChange={(e) =>
                      props.updateAttributeDebounced("fontSize", joinNumberAndUnit(e.target.value, unit))
                    }
                    onBlur={() => props.commitAttribute("fontSize")}
                    placeholder="16"
                  />
                  <Select
                    value={unit}
                    onValueChange={(u) => props.commitAttribute("fontSize", joinNumberAndUnit(num, u))}
                  >
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

        {props.selectedBlock.editable.includes("lineHeight") && (
          <div className="space-y-2">
            <Label>Interligne</Label>
            {(() => {
              const { num, unit } = splitNumberAndUnit(props.attrValues.lineHeight || "");

              return (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={num}
                    onChange={(e) =>
                      props.updateAttributeDebounced("lineHeight", joinNumberAndUnit(e.target.value, unit))
                    }
                    onBlur={() => props.commitAttribute("lineHeight")}
                    placeholder="24"
                  />
                  <Select
                    value={unit}
                    onValueChange={(u) => props.commitAttribute("lineHeight", joinNumberAndUnit(num, u))}
                  >
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

        {props.selectedBlock.editable.includes("padding") && (
          <div className="space-y-2">
            <Label>Padding</Label>
            {(() => {
              const { num, unit } = splitNumberAndUnit(props.attrValues.padding || "");

              return (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={num}
                    onChange={(e) => props.updateAttributeDebounced("padding", joinNumberAndUnit(e.target.value, unit))}
                    onBlur={() => props.commitAttribute("padding")}
                    placeholder="16"
                  />
                  <Select
                    value={unit}
                    onValueChange={(u) => props.commitAttribute("padding", joinNumberAndUnit(num, u))}
                  >
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

        {props.selectedBlock.editable.includes("borderRadius") && (
          <div className="space-y-2">
            <Label>Rayon de bordure</Label>
            {(() => {
              const { num, unit } = splitNumberAndUnit(props.attrValues.borderRadius || "");

              return (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={num}
                    onChange={(e) =>
                      props.updateAttributeDebounced("borderRadius", joinNumberAndUnit(e.target.value, unit))
                    }
                    onBlur={() => props.commitAttribute("borderRadius")}
                    placeholder="6"
                  />
                  <Select
                    value={unit}
                    onValueChange={(u) => props.commitAttribute("borderRadius", joinNumberAndUnit(num, u))}
                  >
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
  );
}

interface BlockCustomizationProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  codeMirrorDebounceRef: RefObject<number | undefined>;
  latestHtmlRef: RefObject<string>;
}

export default function BlockCustomization(props: BlockCustomizationProps) {
  const draft = useDraftStore((s) => s.draft);
  const upsertEdit = useDraftStore((s) => s.upsertEdit);
  const setHtmlCode = useDraftStore((s) => s.setHtmlCode);

  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [attrValues, setAttrValues] = useState<Partial<Record<AttributeName, string>>>({});

  const debounceTimersRef = useRef<Record<string, number | undefined>>({});

  // Flush pending attribute debounce and persist immediately
  const commitAttribute = useCallback(
    (name: AttributeName, providedValue?: string) => {
      if (!selectedBlock) {
        return;
      }

      const key = `${selectedBlock.id}:${name}`;
      const timers = debounceTimersRef.current;

      if (timers[key]) {
        window.clearTimeout(timers[key]);
        timers[key] = undefined;
      }

      const raw = providedValue !== undefined ? providedValue : attrValues[name] || "";
      const value = sanitizeHtml(raw);

      setAttrValues((prev) => ({ ...prev, [name]: value }));

      const edit: EditOp =
        name === "text"
          ? { kind: "setText", id: selectedBlock.id, value }
          : { kind: "setAttr", id: selectedBlock.id, name, value };

      upsertEdit(edit);
    },
    [selectedBlock, attrValues, upsertEdit]
  );

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

      if (props.codeMirrorDebounceRef.current) {
        window.clearTimeout(props.codeMirrorDebounceRef.current);
        props.codeMirrorDebounceRef.current = undefined;
      }

      if (props.latestHtmlRef.current !== undefined) {
        setHtmlCode(props.latestHtmlRef.current);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [selectedBlock, attrValues, setHtmlCode, commitAttribute, props.codeMirrorDebounceRef, props.latestHtmlRef]);

  // Set up iframe message handling
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "elementClick") {
        const block = draft?.manifest.blocks.find((b) => b.id === event.data.elementId);

        if (block) {
          setSelectedBlock(block);
          // Get current values from iframe for all editable attributes
          const iframe = props.iframeRef.current;

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
  }, [draft, props.iframeRef]);

  return (
    <Sheet
      modal={false}
      open={!!selectedBlock}
      onOpenChange={(open) => {
        if (!open) {
          if (selectedBlock) {
            selectedBlock.editable.forEach((attr) => {
              if (attrValues[attr] !== undefined) {
                commitAttribute(attr);
              }
            });
          }

          setSelectedBlock(null);
        }
      }}
    >
      {selectedBlock && (
        <BlockCustomizationContent
          selectedBlock={selectedBlock}
          attrValues={attrValues}
          updateAttributeDebounced={updateAttributeDebounced}
          commitAttribute={commitAttribute}
        />
      )}
    </Sheet>
  );
}
