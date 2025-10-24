"use client";

import GjsEditor from "@grapesjs/react";
import grapesjs, { type Editor } from "grapesjs";
import { useEffect, useRef } from "react";
import EmailEditor, { type EditorRef } from "react-email-editor";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { setCookie } from "@/lib/utils";
import ChatPane from "./chat-pane/ChatPane";
import PreviewPane from "./preview-pane/PreviewPane";
import sample from "./sample.json";

export default function EmailBuilder(props: { defaultLayout: number[] }) {
  let t: number | undefined;

  const emailEditorRef = useRef<EditorRef>(null);

  const hasHydrated = useDraftStore((s) => s._hasHydrated);

  const onLayout = (sizes: number[]) => {
    if (t) {
      window.clearTimeout(t);
    }

    t = window.setTimeout(() => {
      setCookie("react-resizable-panels:layout", sizes);
    }, 150);
  };

  const handleExport = () => {
    const emailEditor = emailEditorRef.current;

    if (emailEditor?.editor) {
      console.log("ICI");
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
        {/* <PreviewPane /> */}
        <Button onClick={handleExport}>Export ZIP</Button>
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
            customCSS: ".blockbuilder-branding { display: none !important; }",
          }}
          onReady={(editor) => {
            editor.loadDesign(sample as any);
          }}
        />
        {/* <GjsEditor
          // Pass the core GrapesJS library to the wrapper (required).
          // You can also pass the CDN url (eg. "https://unpkg.com/grapesjs")
          grapesjs={grapesjs}
          // Load the GrapesJS CSS file asynchronously from URL.
          // This is an optional prop, you can always import the CSS directly in your JS if you wish.
          grapesjsCss="https://unpkg.com/grapesjs/dist/css/grapes.min.css"
          // GrapesJS init options
          options={{
            height: "100vh",
            storageManager: false,
          }}
          onEditor={onEditor}
        /> */}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
