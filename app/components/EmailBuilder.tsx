"use client";

import JSZip from "jszip";
import { Download, Eye } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import EmailEditor, { type EditorRef } from "react-email-editor";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { getDefaultUnlayerDesign } from "@/lib/defaultUnlayerDesign";
import type { UnlayerDesign } from "@/lib/schemas";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { setCookie } from "@/lib/utils";
import ChatPane from "./chat-pane/ChatPane";

interface EmailBuilderProps {
  defaultLayout: number[];
  companyId: string;
  chatId: string;
  workspaceId: string;
  workspaceName: string;
  chatTitle: string;
}

export default function EmailBuilder(props: EmailBuilderProps) {
  let t: number | undefined;

  const emailEditorRef = useRef<EditorRef>(null);
  const editorHostRef = useRef<HTMLDivElement | null>(null);

  const isReady = useDraftStore((s) => s.isReady);
  const unlayerDesign = useDraftStore((s) => s.unlayerDesign);
  const updateDraftHtml = useDraftStore((s) => s.updateDraftHtml);
  const setDraft = useDraftStore((s) => s.setDraft);
  const draft = useDraftStore((s) => s.draft);

  useEffect(() => {
    const editor = emailEditorRef.current?.editor;

    if (!editor) {
      return;
    }

    if (unlayerDesign) {
      editor.loadDesign(unlayerDesign);
    } else {
      getDefaultUnlayerDesign()
        .then((design) => {
          editor.loadDesign(design);
        })
        .catch((error) => {
          console.error("Failed to load default design", error);
        });
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

      for (const [src, filename] of srcToFilename.entries()) {
        const base64 = srcToBase64.get(src);
        if (base64 && imagesFolder) {
          imagesFolder.file(filename, base64, { base64: true, date: new Date() });
        }
      }

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

  if (!isReady) {
    return null;
  }

  return (
    <ResizablePanelGroup direction="horizontal" onLayout={onLayout} className="h-full w-full">
      <ResizablePanel defaultSize={props.defaultLayout[0]} minSize={25} order={1}>
        <ChatPane
          companyId={props.companyId}
          chatId={props.chatId}
          workspaceId={props.workspaceId}
          workspaceName={props.workspaceName}
          chatTitle={props.chatTitle}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={props.defaultLayout[1]} minSize={25} order={2}>
        <div className="flex h-15 items-center justify-end gap-2 border-border border-b bg-primary px-4">
          <Button
            onClick={() => {
              const editor = emailEditorRef.current?.editor;
              if (!editor) {
                window.open("/preview", "_blank");
                return;
              }
              editor.exportHtml((data: { html: string }) => {
                if (data.html) {
                  if (draft) {
                    updateDraftHtml(data.html);
                  } else {
                    setDraft({
                      html_inline: data.html,
                      css_inline: "",
                      manifest: { blocks: [] },
                      config: { font: "arial", primaryColor: "#007bff" },
                      assets: [],
                    });
                  }
                }
                window.open("/preview", "_blank");
              });
            }}
            size="sm"
            className="rounded-full border border-[#FCF5CA]/30 bg-transparent px-4 text-[#FCF5CA]/70 transition-all hover:border-[#FCF5CA] hover:bg-[#FCF5CA]/10 hover:text-[#FCF5CA]"
          >
            <Eye className="h-4 w-4" />
            Prévisualiser
          </Button>
          <Button
            onClick={handleExport}
            size="sm"
            className="rounded-full border border-[#FCF5CA]/30 bg-transparent px-4 text-[#FCF5CA]/70 transition-all hover:border-[#FCF5CA] hover:bg-[#FCF5CA]/10 hover:text-[#FCF5CA]"
          >
            <Download className="h-4 w-4" />
            Exporter ZIP
          </Button>
        </div>
        <div ref={editorHostRef}>
          <EmailEditor
            ref={emailEditorRef}
            projectId={Number(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID)}
            minHeight="95vh"
            options={{
              locale: "fr-FR",
              customCSS: [
                ".blockbuilder-branding { display: none !important; }",
                `.toolbar {
                  background: oklch(0.255 0.1136 261.47) !important;
                  border-bottom: 1px solid rgba(252, 245, 202, 0.15) !important;
                }`,
                `.toolbar-left {
                  flex: 1 !important;
                  display: flex !important;
                  align-items: center !important;
                  gap: 2px !important;
                }`,
                ".toolbar-right { flex: 1 !important; justify-content: flex-end !important; }",
                `.toolbar .toolbar-button,
                [data-key="undo"],
                [data-key="redo"] {
                  color: #FCF5CA !important;
                  border-radius: 999px !important;
                  width: 32px !important;
                  height: 28px !important;
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  background: transparent !important;
                  box-shadow: none !important;
                  border: none !important;
                }`,
                `.toolbar .toolbar-button:not(.disabled):hover {
                  color: rgba(252, 245, 202, 0.9) !important;
                  background: rgba(252, 245, 202, 0.1) !important;
                }`,
                `.toolbar .toolbar-button.disabled {
                  color: #FCF5CA !important;
                  opacity: 0.35 !important;
                  cursor: not-allowed !important;
                }`,
                ".toolbar .separator-container { display: none !important; }",
                ".toolbar-right { visibility: hidden !important; }",
                `.toolbar-center {
                  display: flex !important;
                  align-items: center;
                  gap: 2px;
                  background: rgba(252, 245, 202, 0.05) !important;
                  border: 1px solid rgba(252, 245, 202, 0.2) !important;
                  border-radius: 999px !important;
                  padding: 3px !important;
                }`,
                `.toolbar-center .device-button {
                  display: flex !important;
                  align-items: center !important;
                  justify-content: center !important;
                  width: 32px !important;
                  height: 28px !important;
                  border-radius: 999px !important;
                  border: none !important;
                  background: transparent !important;
                  color: rgba(252, 245, 202, 0.5) !important;
                  cursor: pointer !important;
                  transition: all 0.15s ease !important;
                  box-shadow: none !important;
                }`,
                `.toolbar-center .device-button:hover {
                  color: rgba(252, 245, 202, 0.9) !important;
                  background: rgba(252, 245, 202, 0.1) !important;
                }`,
                `.toolbar-center .device-button.selected {
                  background: #FCF5CA !important;
                  color: #1a2c5b !important;
                }`,
              ],
              translations: {
                "en-US": {
                  "tools.tabs.content": "Contenu",
                  "tools.tabs.blocks": "Blocs",
                  "tools.tabs.body": "Corps",
                },
              },
            }}
            onReady={(editor) => {
              if (unlayerDesign) {
                editor.loadDesign(unlayerDesign);
              } else {
                getDefaultUnlayerDesign()
                  .then((design) => {
                    editor.loadDesign(design);
                  })
                  .catch((error) => {
                    console.error("Failed to load default design", error);
                  });
              }
            }}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
