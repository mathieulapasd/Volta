"use client";

import { Download } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import EmailEditor, { type EditorRef } from "react-email-editor";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { UnlayerDesign } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { setCookie } from "@/lib/utils";
import ChatPane from "./chat-pane/ChatPane";
import sample from "./sample.json";

export default function EmailBuilder(props: { defaultLayout: number[] }) {
  let t: number | undefined;

  const emailEditorRef = useRef<EditorRef>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);

  const hasHydrated = useDraftStore((s) => s._hasHydrated);
  const unlayerDesign = useDraftStore((s) => s.unlayerDesign);

  console.log("unlayerDesign", unlayerDesign);

  useEffect(() => {
    if (unlayerDesign) {
      console.log("ICI", unlayerDesign);
      emailEditorRef.current?.editor?.loadDesign(unlayerDesign);
    }
  }, [unlayerDesign]);

  const onLayout = (sizes: number[]) => {
    if (t) {
      window.clearTimeout(t);
    }

    t = window.setTimeout(() => {
      setCookie("react-resizable-panels:layout", sizes);
    }, 150);
  };

  const clearEditorSelection = useCallback(() => {
    const instance = emailEditorRef.current?.editor;

    if (!instance) {
      return;
    }

    // Simple and reliable: re-load current design, which clears selection
    instance.saveDesign((design: UnlayerDesign) => {
      instance.loadDesign(design);
    });
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const host = editorHostRef.current;

      if (!host) {
        return;
      }

      const target = event.target as Node | null;

      if (target && !host.contains(target)) {
        clearEditorSelection();
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [clearEditorSelection]);

  const handleExport = () => {
    const emailEditor = emailEditorRef.current;

    if (emailEditor?.editor) {
      emailEditor.editor.exportHtml((data) => {
        if (data.html) {
          // Export the HTML by creating a blob and triggering a download
          const blob = new Blob([data.html], { type: "text/html" });

          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");
          link.href = url;
          link.download = "email.html";

          document.body.appendChild(link);
          link.click();

          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      });
    }
  };

  if (!hasHydrated) {
    return null;
  }

  return (
    <ResizablePanelGroup direction="horizontal" onLayout={onLayout}>
      <ResizablePanel defaultSize={props.defaultLayout[0]} minSize={25} order={1}>
        <ChatPane />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={props.defaultLayout[1]} minSize={25} order={2}>
        <div className="flex h-15 items-center justify-end border-border border-b bg-primary px-4">
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download />
            Exporter ZIP
          </Button>
        </div>
        <div ref={editorHostRef}>
          <EmailEditor
            ref={emailEditorRef}
            minHeight="95vh"
            options={{
              locale: "en-US",
              translations: {
                "en-US": {
                  "tools.tabs.content": "Contenu",
                  "tools.tabs.blocks": "Blocs",
                  "tools.tabs.body": "Corps",
                },
              },
            }}
            onReady={(editor) => {
              console.log("onReady", unlayerDesign);
              if (unlayerDesign) {
                editor.loadDesign(unlayerDesign);
              } else {
                editor.loadDesign(sample as unknown as UnlayerDesign);
              }
            }}
          />
          {/* <div className="absolute bottom-0 right-0 bg-gray-50 w-106 h-9" /> */}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
