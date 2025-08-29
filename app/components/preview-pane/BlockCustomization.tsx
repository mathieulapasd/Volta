"use client";

import { memo, type RefObject, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { debounce } from "@/lib/debounce";
import { getCurrentValue, getElement, sanitizeHtml } from "@/lib/emailEditing";
import type { AttributeName, EmailBlock } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import ColorInput from "./ColorInput";
import NumberInputWithUnitSelect from "./NumberInputWithUnitSelect";

const IsolatedColor = memo(function IsolatedColor(props: {
  initialValue?: string;
  onCommit: (value: string) => void;
  onBlur: () => void;
}) {
  const [value, setValue] = useState<string>(props.initialValue ?? "");

  useEffect(() => {
    setValue(props.initialValue ?? "");
  }, [props.initialValue]);

  const throttledCommit = useMemo(
    () =>
      rafThrottle((v: string) => {
        props.onCommit(v);
      }),
    [props.onCommit]
  );
  return (
    <ColorInput
      value={value}
      onChange={(v) => {
        const next = v ?? "";

        setValue(next);
        throttledCommit(next);
      }}
      onBlur={() => {
        props.onCommit(value);
        props.onBlur();
      }}
    />
  );
});

interface BlockCustomizationContentProps {
  selectedBlock: EmailBlock;
  initialValues: Partial<Record<AttributeName, string>>;
  onFieldChange: (name: AttributeName, providedValue: string) => void;
  onFieldBlur: (name: AttributeName, doSanitize?: true) => void;
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
              defaultValue={(props.initialValues.text || "").trim()}
              onChange={(e) => props.onFieldChange("text", e.target.value)}
              onBlur={() => props.onFieldBlur("text", true)}
              placeholder="Entrer le texte..."
              rows={4}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("href") && (
          <div className="space-y-2">
            <Label>Lien</Label>
            <Input
              value={props.initialValues.href || "#"}
              onChange={(e) => props.onFieldChange("href", e.target.value)}
              onBlur={() => props.onFieldBlur("href")}
              placeholder="https://exemple.com"
              type="url"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("target") && (
          <div className="space-y-2">
            <Label>Cible</Label>
            <Select
              value={props.initialValues.target || "_self"}
              onValueChange={(v) => props.onFieldChange("target", v)}
              onOpenChange={(open) => {
                if (!open) {
                  props.onFieldBlur("target");
                }
              }}
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
            <Select value={props.initialValues.src || ""} onValueChange={(v) => props.commitAttribute("src", v)}>
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
              value={props.initialValues.alt || ""}
              onChange={(e) => props.onFieldChange("alt", e.target.value)}
              onBlur={() => props.onFieldBlur("alt")}
              placeholder="Description de l'image"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("width") && (
          <div className="space-y-2">
            <Label>Largeur (px)</Label>
            <Input
              type="number"
              value={props.initialValues.width || ""}
              onChange={(e) => props.onFieldChange("width", e.target.value)}
              onBlur={() => props.onFieldBlur("width")}
              placeholder="Ex: 600"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("height") && (
          <div className="space-y-2">
            <Label>Hauteur (px)</Label>
            <Input
              type="number"
              value={props.initialValues.height || ""}
              onChange={(e) => props.onFieldChange("height", e.target.value)}
              onBlur={() => props.onFieldBlur("height")}
              placeholder="Ex: 300"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("color") && (
          <div className="space-y-2">
            <Label>Couleur du texte</Label>
            <IsolatedColor
              initialValue={props.initialValues.color}
              onCommit={(v) => props.onFieldChange("color", v)}
              onBlur={() => props.onFieldBlur("color")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("bgcolor") && (
          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <IsolatedColor
              initialValue={props.initialValues.bgcolor || "#ffffff"}
              onCommit={(v) => props.onFieldChange("bgcolor", v)}
              onBlur={() => props.onFieldBlur("bgcolor")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("fontWeight") && (
          <div className="space-y-2">
            <Label>Épaisseur du texte</Label>
            <Select
              value={props.initialValues.fontWeight || ""}
              onValueChange={(v) => props.onFieldChange("fontWeight", v)}
              onOpenChange={(open) => {
                if (!open) {
                  props.onFieldBlur("fontWeight");
                }
              }}
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
              value={props.initialValues.textAlign || "left"}
              onValueChange={(v) => props.onFieldChange("textAlign", v)}
              onOpenChange={(open) => {
                if (!open) {
                  props.onFieldBlur("textAlign");
                }
              }}
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
              value={props.initialValues.fontSize || ""}
              onChange={(v) => props.onFieldChange("fontSize", v)}
              onBlur={() => props.onFieldBlur("fontSize")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("lineHeight") && (
          <div className="space-y-2">
            <Label>Interligne</Label>
            <NumberInputWithUnitSelect
              value={props.initialValues.lineHeight || ""}
              onChange={(v) => props.onFieldChange("lineHeight", v)}
              onBlur={() => props.onFieldBlur("lineHeight")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("padding") && (
          <div className="space-y-2">
            <Label>Padding</Label>
            <NumberInputWithUnitSelect
              value={props.initialValues.padding || ""}
              onChange={(v) => props.onFieldChange("padding", v)}
              onBlur={() => props.onFieldBlur("padding")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("borderRadius") && (
          <div className="space-y-2">
            <Label>Rayon de bordure</Label>
            <NumberInputWithUnitSelect
              value={props.initialValues.borderRadius || ""}
              onChange={(v) => props.onFieldChange("borderRadius", v)}
              onBlur={() => props.onFieldBlur("borderRadius")}
            />
          </div>
        )}
      </div>
    </SheetContent>
  );
}

const MemoBlockCustomizationContent = memo(BlockCustomizationContent);

// biome-ignore lint/suspicious/noExplicitAny: makes sense
function rafThrottle<T extends (...args: any[]) => void>(fn: T) {
  let ticking = false;
  return (...args: Parameters<T>) => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      fn(...args);
    });
  };
}

interface BlockCustomizationProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

export default function BlockCustomization(props: BlockCustomizationProps) {
  const manifest = useDraftStore((s) => s.draft?.manifest);
  const updateDraftHtml = useDraftStore((s) => s.updateDraftHtml);

  const manifestRef = useRef(manifest);

  const [selectedBlock, setSelectedBlock] = useState<EmailBlock | null>(null);
  const [attrValues, setAttrValues] = useState<Partial<Record<AttributeName, string>>>({});

  const debouncedUpdateDraftHtml = useMemo(
    () =>
      debounce(() => {
        const html = props.iframeRef.current?.contentWindow?.document.documentElement.outerHTML;

        if (html) {
          startTransition(() => {
            updateDraftHtml(html);
          });
        }
      }, 300),
    [updateDraftHtml, props.iframeRef]
  );

  const applyToIframe = useCallback(
    (name: AttributeName, providedValue: string) => {
      if (!selectedBlock) {
        return;
      }

      const raw = providedValue ?? "";
      const value = name === "text" ? sanitizeHtml(raw) : raw;

      const element = getElement(props.iframeRef.current, selectedBlock.selector);

      if (!element) {
        return;
      }

      if (name === "text") {
        element.textContent = value;
      } else if (name === "color") {
        (element as HTMLElement).style.setProperty("color", value);
      } else if (name === "bgcolor") {
        (element as HTMLElement).style.setProperty("background-color", value);
      } else {
        element.setAttribute(name, value);
      }
    },
    [props.iframeRef, selectedBlock]
  );

  const scheduleApply = useMemo(
    () =>
      rafThrottle((name: AttributeName, val: string) => {
        applyToIframe(name, val);
        debouncedUpdateDraftHtml();
      }),
    [applyToIframe, debouncedUpdateDraftHtml]
  );

  const onFieldChange = useCallback(
    (name: AttributeName, raw: string) => {
      scheduleApply(name, raw);
    },
    [scheduleApply]
  );

  const onFieldBlur = useCallback(
    (name: AttributeName, doSanitize?: true) => {
      const element = selectedBlock ? getElement(props.iframeRef.current, selectedBlock.selector) : null;

      if (!element) {
        return;
      }

      let val = getCurrentValue(element, name) ?? "";

      if (doSanitize) {
        const sanitized = sanitizeHtml(val);

        if (sanitized !== val) {
          val = sanitized;

          scheduleApply(name, val);
        }
      } else {
        debouncedUpdateDraftHtml();
      }
    },
    [scheduleApply, debouncedUpdateDraftHtml, props.iframeRef, selectedBlock]
  );

  useEffect(() => {
    manifestRef.current = manifest;
  }, [manifest]);

  // Set up iframe message handling
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type !== "elementClick") {
        return;
      }

      const block = manifestRef.current?.blocks.find((b) => b.id === event.data.elementId);

      if (!block) {
        return;
      }

      setSelectedBlock(block);

      // Get current values from iframe for all editable attributes
      const element = getElement(props.iframeRef.current, block.selector);

      if (!element) {
        return;
      }

      const next: Partial<Record<AttributeName, string>> = {};

      block.editable.forEach((attr) => {
        next[attr] = getCurrentValue(element, attr);
      });

      setAttrValues(next);
    };

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [props.iframeRef]);

  useEffect(() => {
    return () => {
      debouncedUpdateDraftHtml.cancel();
    };
  }, [debouncedUpdateDraftHtml]);

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
        <MemoBlockCustomizationContent
          key={selectedBlock.id}
          selectedBlock={selectedBlock}
          initialValues={attrValues}
          onFieldChange={onFieldChange}
          onFieldBlur={onFieldBlur}
        />
      )}
    </Sheet>
  );
}
