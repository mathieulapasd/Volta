"use client";

import JSZip from "jszip";
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

  const handleExport = async () => {
    const emailEditor = emailEditorRef.current;

    if (emailEditor?.editor) {
      const getHtml = (): Promise<string> =>
        new Promise((resolve) => {
          emailEditor.editor?.exportHtml((data) => {
            resolve(data.html || "");
          });
        });

      const html = await getHtml();

      if (!html) {
        return;
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const zip = new JSZip();
      const imagesFolder = zip.folder("images");

      const imageElements = Array.from(doc.querySelectorAll("img[src]")) as HTMLImageElement[];
      const srcToFilename = new Map<string, string>();
      const srcToBase64 = new Map<string, string>();

      let imageIndex = 1;

      const toBase64 = async (blob: Blob): Promise<string> => {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = typeof reader.result === "string" ? reader.result : "";
            const base64 = result.split(",")[1] || "";
            resolve(base64);
          };
          reader.onerror = () => reject(new Error("Failed to read blob"));
          reader.readAsDataURL(blob);
        });
      };

      const getExtensionFromMime = (mime: string): string => {
        if (mime === "image/jpeg" || mime === "image/jpg") {
          return "jpg";
        }
        if (mime === "image/png") {
          return "png";
        }
        if (mime === "image/gif") {
          return "gif";
        }
        if (mime === "image/webp") {
          return "webp";
        }
        if (mime === "image/svg+xml") {
          return "svg";
        }
        const slashIndex = mime.indexOf("/");
        return slashIndex > -1 ? mime.slice(slashIndex + 1) : "bin";
      };

      const getNameFromUrl = (url: string): string => {
        try {
          const u = new URL(url);
          const last = u.pathname.split("/").filter(Boolean).pop();
          return last || "image";
        } catch {
          const parts = url.split("/").filter(Boolean);
          return parts.pop() || "image";
        }
      };

      const tasks = imageElements.map(async (img) => {
        const src = img.getAttribute("src") || "";

        if (!src || !imagesFolder) {
          return;
        }

        if (srcToFilename.has(src)) {
          const filename = srcToFilename.get(src) as string;
          img.setAttribute("src", `images/${filename}`);
          return;
        }

        try {
          let base64 = "";
          let filename = "";

          if (src.startsWith("data:")) {
            const mime = src.slice(5, src.indexOf(";")) || "application/octet-stream";
            const ext = getExtensionFromMime(mime);
            filename = `image-${imageIndex++}.${ext}`;
            base64 = src.split(",")[1] || "";
          } else {
            const response = await fetch(src, { cache: "no-store" });
            if (!response.ok) {
              return;
            }
            const blob = await response.blob();
            const mime = blob.type || "application/octet-stream";
            const urlName = getNameFromUrl(src);
            const dotExt = urlName.includes(".") ? urlName.split(".").pop() || "" : "";
            const ext = dotExt || getExtensionFromMime(mime);
            filename = `image-${imageIndex++}.${ext}`;
            base64 = await toBase64(blob);
          }

          if (!base64) {
            return;
          }

          srcToFilename.set(src, filename);
          srcToBase64.set(src, base64);
          img.setAttribute("src", `images/${filename}`);
        } catch {
          // If fetching fails, keep original src
        }
      });

      await Promise.all(tasks);

      // Write images to zip
      for (const [src, filename] of srcToFilename.entries()) {
        const base64 = srcToBase64.get(src);
        if (base64 && imagesFolder) {
          imagesFolder.file(filename, base64, { base64: true, date: new Date() });
        }
      }

      // Add single HTML file
      const finalHtml = doc.documentElement.outerHTML;
      zip.file("index.html", finalHtml);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "email-template.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
