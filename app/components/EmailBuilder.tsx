"use client";

import GjsEditor from "@grapesjs/react";
import grapesjs, { type Editor } from "grapesjs";
import { useEffect, useRef } from "react";
import EmailEditor, { type EditorRef } from "react-email-editor";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { setCookie } from "@/lib/utils";
import ChatPane from "./chat-pane/ChatPane";
import PreviewPane from "./preview-pane/PreviewPane";

export default function EmailBuilder(props: { defaultLayout: number[] }) {
  let t: number | undefined;

  const gjsRef = useRef<Editor | null>(null);
  const emailEditorRef = useRef<EditorRef>(null);

  const hasHydrated = useDraftStore((s) => s._hasHydrated);
  const draft = useDraftStore((s) => s.draft);

  const onLayout = (sizes: number[]) => {
    if (t) {
      window.clearTimeout(t);
    }

    t = window.setTimeout(() => {
      setCookie("react-resizable-panels:layout", sizes);
    }, 150);
  };

  const onEditor = (editor: Editor) => {
    gjsRef.current = editor;
    if (draft?.html_inline) {
      editor.setComponents(draft?.html_inline ?? "");
    } else {
      editor.setComponents(
        "<div><section data-gjs-type='section'><h1>Bonjour !</h1></section><div data-gjs-type='div'><p>Ceci est un paragraphe.</p></div></div>"
      );
    }
  };

  useEffect(() => {
    if (gjsRef.current) {
      gjsRef.current.setComponents(draft?.html_inline ?? "");
    }
  }, [draft?.html_inline]);

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
        {/* <EmailEditor ref={emailEditorRef} /> */}
        <GjsEditor
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
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
