"use client";

import { Upload } from "lucide-react";
import {
  type ChangeEvent,
  memo,
  type RefObject,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { debounce, rafThrottle } from "@/lib/debounce";
import { getCurrentValue, getElement, getImageTarget, sanitizeHtml } from "@/lib/emailEditing";
import type { AttributeName, EmailBlock } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { IsolatedColorInput } from "./ColorInput";
import { IsolatedSelect } from "./IsolatedSelect";
import NumberInputWithUnitSelect from "./NumberInputWithUnitSelect";

const IsolatedNumberUnit = memo(function IsolatedNumberUnit(props: {
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
    <NumberInputWithUnitSelect
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

const IsolatedImageInput = memo(function IsolatedImageInput(props: {
  initialValue?: string;
  onCommit: (value: string) => void;
  onBlur: () => void;
}) {
  const [value, setValue] = useState<string>(props.initialValue ?? "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addAsset = useDraftStore((s) => s.addAsset);

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

  const onPickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : "";

        if (!result) {
          return;
        }

        // Persist the image into the draft assets for export, but keep data URL in preview
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        addAsset({
          filename: safeName,
          mimeType: file.type || "application/octet-stream",
          dataUrl: result,
        });

        setValue(result);
        props.onCommit(result);
        props.onBlur();
      };

      reader.readAsDataURL(file);
    },
    [addAsset, props]
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          placeholder="https://... or data:image/..."
          value={value}
          onChange={(e) => {
            const next = e.target.value ?? "";

            setValue(next);
            throttledCommit(next);
          }}
          onBlur={() => {
            props.onCommit(value);
            props.onBlur();
          }}
          type="text"
        />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        <Button variant="outline" size="icon" onClick={onPickFile}>
          <Upload />
        </Button>
      </div>
    </div>
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
              defaultValue={props.initialValues.href || "#"}
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
            <IsolatedSelect
              initialValue={props.initialValues.target || "_self"}
              onCommit={(v) => props.onFieldChange("target", v)}
              onBlur={() => props.onFieldBlur("target")}
            >
              <SelectItem value="_self">Même onglet</SelectItem>
              <SelectItem value="_blank">Nouvel onglet</SelectItem>
            </IsolatedSelect>
          </div>
        )}

        {props.selectedBlock.editable.includes("src") && (
          <div className="space-y-2">
            <Label>Image</Label>
            <IsolatedImageInput
              initialValue={props.initialValues.src || ""}
              onCommit={(v) => props.onFieldChange("src", v)}
              onBlur={() => props.onFieldBlur("src")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("alt") && (
          <div className="space-y-2">
            <Label>Description de l'image</Label>
            <Input
              defaultValue={props.initialValues.alt || ""}
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
              defaultValue={props.initialValues.width || ""}
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
              defaultValue={props.initialValues.height || ""}
              onChange={(e) => props.onFieldChange("height", e.target.value)}
              onBlur={() => props.onFieldBlur("height")}
              placeholder="Ex: 300"
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("color") && (
          <div className="space-y-2">
            <Label>Couleur du texte</Label>
            <IsolatedColorInput
              initialValue={props.initialValues.color}
              onCommit={(v) => props.onFieldChange("color", v)}
              onBlur={() => props.onFieldBlur("color")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("bgcolor") && (
          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <IsolatedColorInput
              initialValue={props.initialValues.bgcolor || "#ffffff"}
              onCommit={(v) => props.onFieldChange("bgcolor", v)}
              onBlur={() => props.onFieldBlur("bgcolor")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("fontWeight") && (
          <div className="space-y-2">
            <Label>Épaisseur du texte</Label>
            <IsolatedSelect
              initialValue={props.initialValues.fontWeight || ""}
              onCommit={(v) => props.onFieldChange("fontWeight", v)}
              onBlur={() => props.onFieldBlur("fontWeight")}
            >
              <SelectItem value="400">Normal</SelectItem>
              <SelectItem value="700">Gras</SelectItem>
            </IsolatedSelect>
          </div>
        )}

        {props.selectedBlock.editable.includes("textAlign") && (
          <div className="space-y-2">
            <Label>Alignement</Label>
            <IsolatedSelect
              initialValue={props.initialValues.textAlign || "left"}
              onCommit={(v) => props.onFieldChange("textAlign", v)}
              onBlur={() => props.onFieldBlur("textAlign")}
            >
              <SelectItem value="left">Gauche</SelectItem>
              <SelectItem value="center">Centre</SelectItem>
              <SelectItem value="right">Droite</SelectItem>
            </IsolatedSelect>
          </div>
        )}

        {props.selectedBlock.editable.includes("fontSize") && (
          <div className="space-y-2">
            <Label>Taille du texte</Label>
            <IsolatedNumberUnit
              initialValue={props.initialValues.fontSize || ""}
              onCommit={(v) => props.onFieldChange("fontSize", v)}
              onBlur={() => props.onFieldBlur("fontSize")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("lineHeight") && (
          <div className="space-y-2">
            <Label>Interligne</Label>
            <IsolatedNumberUnit
              initialValue={props.initialValues.lineHeight || ""}
              onCommit={(v) => props.onFieldChange("lineHeight", v)}
              onBlur={() => props.onFieldBlur("lineHeight")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("padding") && (
          <div className="space-y-2">
            <Label>Padding</Label>
            <IsolatedNumberUnit
              initialValue={props.initialValues.padding || ""}
              onCommit={(v) => props.onFieldChange("padding", v)}
              onBlur={() => props.onFieldBlur("padding")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("borderRadius") && (
          <div className="space-y-2">
            <Label>Rayon de bordure</Label>
            <IsolatedNumberUnit
              initialValue={props.initialValues.borderRadius || ""}
              onCommit={(v) => props.onFieldChange("borderRadius", v)}
              onBlur={() => props.onFieldBlur("borderRadius")}
            />
          </div>
        )}

        {props.selectedBlock.editable.includes("fontStyle") && (
          <div className="space-y-2">
            <Label>Italique</Label>
            <Button
              variant={props.initialValues.fontStyle === "italic" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const next = props.initialValues.fontStyle === "italic" ? "normal" : "italic";
                props.onFieldChange("fontStyle", next);
                props.onFieldBlur("fontStyle");
              }}
              className="w-full"
            >
              <em>I</em>&nbsp;Italique
            </Button>
          </div>
        )}

        {props.selectedBlock.editable.includes("textDecoration") && (
          <div className="space-y-2">
            <Label>Décoration</Label>
            <div className="flex gap-2">
              <Button
                variant={props.initialValues.textDecoration === "line-through" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  const next = props.initialValues.textDecoration === "line-through" ? "none" : "line-through";
                  props.onFieldChange("textDecoration", next);
                  props.onFieldBlur("textDecoration");
                }}
              >
                <s>S</s>&nbsp;Barré
              </Button>
              <Button
                variant={props.initialValues.textDecoration === "underline" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => {
                  const next = props.initialValues.textDecoration === "underline" ? "none" : "underline";
                  props.onFieldChange("textDecoration", next);
                  props.onFieldBlur("textDecoration");
                }}
              >
                <u>U</u>&nbsp;Souligné
              </Button>
            </div>
          </div>
        )}
      </div>
    </SheetContent>
  );
}

const MemoBlockCustomizationContent = memo(BlockCustomizationContent);

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

      switch (name) {
        case "text":
          element.textContent = value;
          break;
        case "color":
          (element as HTMLElement).style.setProperty("color", value);
          break;
        case "bgcolor":
          (element as HTMLElement).style.setProperty("background-color", value);
          break;
        case "fontWeight":
          (element as HTMLElement).style.setProperty("font-weight", value);
          break;
        case "textAlign":
          (element as HTMLElement).style.setProperty("text-align", value);
          break;
        case "fontSize":
          (element as HTMLElement).style.setProperty("font-size", value);
          break;
        case "lineHeight":
          (element as HTMLElement).style.setProperty("line-height", value);
          break;
        case "padding":
          (element as HTMLElement).style.setProperty("padding", value);
          break;
        case "borderRadius":
          (element as HTMLElement).style.setProperty("border-radius", value);
          break;
        case "fontStyle":
          (element as HTMLElement).style.setProperty("font-style", value);
          break;
        case "textDecoration":
          (element as HTMLElement).style.setProperty("text-decoration", value);
          break;
        case "width": {
          const target = getImageTarget(element) as HTMLElement;
          const numeric = value.trim();
          const css = /px$/i.test(numeric) ? numeric : `${numeric}px`;

          target.style.setProperty("width", css);
          target.setAttribute("width", numeric.replace(/px$/i, ""));
          break;
        }
        case "height": {
          const target = getImageTarget(element) as HTMLElement;
          const numeric = value.trim();
          const css = /px$/i.test(numeric) ? numeric : `${numeric}px`;

          target.style.setProperty("height", css);
          target.setAttribute("height", numeric.replace(/px$/i, ""));
          break;
        }
        case "alt":
          getImageTarget(element).setAttribute("alt", value);
          break;
        case "src":
          getImageTarget(element).setAttribute("src", value);
          break;
        default:
          element.setAttribute(name, value);
          break;
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
      if (!event?.data || event.data.type !== "elementClick") {
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
        next[attr as import("@/lib/schemas").AttributeName] = getCurrentValue(element, attr);
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
    <>
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
    </>
  );
}
