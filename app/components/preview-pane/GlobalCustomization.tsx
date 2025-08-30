"use client";

import { Settings } from "lucide-react";
import { type RefObject, startTransition, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { debounce, rafThrottle } from "@/lib/debounce";
import { fontEnum, fontToCssMap, fontToLabelMap, type GlobalAttributeName } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { IsolatedColorInput } from "./ColorInput";
import { IsolatedSelect } from "./IsolatedSelect";

interface GlobalCustomizationProps {
  iframeRef: RefObject<HTMLIFrameElement | null>;
}

export default function GlobalCustomization(props: GlobalCustomizationProps) {
  const config = useDraftStore((s) => s.draft?.config);
  const updateDraftHtml = useDraftStore((s) => s.updateDraftHtml);

  const attrValues = useMemo<Partial<Record<GlobalAttributeName, string>>>(
    () => ({
      font: config?.font,
      primaryColor: config?.primaryColor,
    }),
    [config]
  );

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
    (name: GlobalAttributeName, providedValue: string) => {
      const iframe = props.iframeRef.current;

      if (!iframe) {
        return;
      }

      const document = iframe.contentDocument ?? iframe.contentWindow?.document;

      if (!document) {
        return;
      }

      if (name === "font") {
        const value = fontEnum.default("arial").catch("arial").parse(providedValue);

        document.body.style.setProperty("font-family", fontToCssMap[value]);
      } else if (name === "primaryColor") {
        document.documentElement.style.setProperty("--primary", providedValue);
      }
    },
    [props.iframeRef]
  );

  const scheduleApply = useMemo(
    () =>
      rafThrottle((name: GlobalAttributeName, val: string) => {
        applyToIframe(name, val);
        debouncedUpdateDraftHtml();
      }),
    [applyToIframe, debouncedUpdateDraftHtml]
  );

  const onFieldChange = useCallback(
    (name: GlobalAttributeName, raw: string) => {
      scheduleApply(name, raw);
    },
    [scheduleApply]
  );

  useEffect(() => {
    return () => {
      debouncedUpdateDraftHtml.cancel();
    };
  }, [debouncedUpdateDraftHtml]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings />
          Préférences
        </Button>
      </SheetTrigger>
      <SheetContent side="right" withOverlay={false} onPointerDownOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Préférences globales</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label>Police</Label>
            <IsolatedSelect initialValue={attrValues.font ?? "arial"} onCommit={(v) => onFieldChange("font", v)}>
              {Object.entries(fontToLabelMap).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value}
                </SelectItem>
              ))}
            </IsolatedSelect>
          </div>
          <div className="space-y-2">
            <Label>Couleur primaire</Label>
            <IsolatedColorInput
              initialValue={attrValues.primaryColor ?? "#007bff"}
              onCommit={(v) => onFieldChange("primaryColor", v)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
