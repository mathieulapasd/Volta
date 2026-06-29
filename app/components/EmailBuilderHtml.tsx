"use client";

import { useCallback, useEffect } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useDraftStore } from "@/lib/store/useDraftStore";
import { setCookie } from "@/lib/utils";
import ChatPaneHtml from "./chat-pane/ChatPaneHtml";
import PreviewPane from "./preview-pane/PreviewPane";

interface EmailBuilderHtmlProps {
  defaultLayout: number[];
  companyId: string;
  chatId: string;
  workspaceId: string;
  workspaceName: string;
  chatTitle: string;
}

export default function EmailBuilderHtml(props: EmailBuilderHtmlProps) {
  let t: number | undefined;

  const setReady = useDraftStore((s) => s.setReady);

  // Always ready — PreviewPane handles the "no draft" state gracefully
  useEffect(() => {
    setReady(true);
  }, [setReady]);

  const onLayout = useCallback((sizes: number[]) => {
    if (t) window.clearTimeout(t);
    t = window.setTimeout(() => {
      setCookie("react-resizable-panels:layout", sizes);
    }, 150);
  }, []);

  return (
    <ResizablePanelGroup direction="horizontal" onLayout={onLayout} className="h-full w-full">
      <ResizablePanel defaultSize={props.defaultLayout[0]} minSize={25} order={1}>
        <ChatPaneHtml
          companyId={props.companyId}
          chatId={props.chatId}
          workspaceId={props.workspaceId}
          workspaceName={props.workspaceName}
          chatTitle={props.chatTitle}
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={props.defaultLayout[1]} minSize={25} order={2}>
        <PreviewPane />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
