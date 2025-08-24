"use client";

import { type RefObject, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentValue, sanitizeHtml } from "@/lib/emailEditing";
import type { AttributeName, EmailBlock } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import ColorInput from "./ColorInput";
import NumberInputWithUnitSelect from "./NumberInputWithUnitSelect";

interface BlockCustomizationContentProps {
  selectedBlock: EmailBlock;
  attrValues: Partial<Record<AttributeName, string>>;
  commitAttribute: (name: AttributeName, providedValue: string) => void;
}

function BlockCustomizationContent(props: BlockCustomizationContentProps) {
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
              onChange={(e) => props.commitAttribute("text", e.target.value)}
              placeholder="Entrer le texte..."
              rows={4}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("href") && (
          <div className="space-y-2">
            <Label>Lien</Label>
            <Input
              value={props.attrValues.href || "#"}
              onChange={(e) => props.commitAttribute("href", e.target.value)}
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

        {/* {props.selectedBlock.editable.includes("src") && (
          <div className="space-y-2">
            <Label>Image</Label>
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
        )} */}

        {props.selectedBlock.editable.includes("alt") && (
          <div className="space-y-2">
            <Label>Description de l'image</Label>
            <Input
              value={props.attrValues.alt || ""}
              onChange={(e) => props.commitAttribute("alt", e.target.value)}
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
              onChange={(e) => props.commitAttribute("width", e.target.value)}
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
              onChange={(e) => props.commitAttribute("height", e.target.value)}
              placeholder="Ex: 300"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("color") && (
          <div className="space-y-2">
            <Label>Couleur du texte</Label>
            <ColorInput value={props.attrValues.color} onChange={(v) => props.commitAttribute("color", v)} />
          </div>
        )}

        {props.selectedBlock.editable.includes("bgcolor") && (
          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <ColorInput
              value={props.attrValues.bgcolor || "#ffffff"}
              onChange={(v) => props.commitAttribute("bgcolor", v)}
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
            <NumberInputWithUnitSelect
              value={props.attrValues.fontSize || ""}
              onChange={(v) => props.commitAttribute("fontSize", v)}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("lineHeight") && (
          <div className="space-y-2">
            <Label>Interligne</Label>
            <NumberInputWithUnitSelect
              value={props.attrValues.lineHeight || ""}
              onChange={(v) => props.commitAttribute("lineHeight", v)}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("padding") && (
          <div className="space-y-2">
            <Label>Padding</Label>
            <NumberInputWithUnitSelect
              value={props.attrValues.padding || ""}
              onChange={(v) => props.commitAttribute("padding", v)}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("borderRadius") && (
          <div className="space-y-2">
            <Label>Rayon de bordure</Label>
            <NumberInputWithUnitSelect
              value={props.attrValues.borderRadius || ""}
              onChange={(v) => props.commitAttribute("borderRadius", v)}
            />
          </div>
        )}
      </div>
    </SheetContent>
  );
}

interface BlockCustomizationProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

export default function BlockCustomization(props: BlockCustomizationProps) {
  const draft = useDraftStore((s) => s.draft);

  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [attrValues, setAttrValues] = useState<Partial<Record<AttributeName, string>>>({});

  console.log("attrValues", attrValues);

  const commitAttribute = (name: AttributeName, providedValue: string) => {
    if (!selectedBlock) {
      return;
    }

    const raw = providedValue !== undefined ? providedValue : attrValues[name] || "";
    const value = sanitizeHtml(raw);

    setAttrValues((prev) => ({ ...prev, [name]: value }));
  };

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
          setSelectedBlock(null);
        }
      }}
    >
      {selectedBlock && (
        <BlockCustomizationContent
          selectedBlock={selectedBlock}
          attrValues={attrValues}
          commitAttribute={commitAttribute}
        />
      )}
    </Sheet>
  );
}
