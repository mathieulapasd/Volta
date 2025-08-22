"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { setCookie } from "@/lib/utils";
import ChatPane from "./ChatPane";
import PreviewPane from "./PreviewPane";

export default function EmailBuilder(props: { defaultLayout: number[] }) {
  let t: number | undefined;

  const onLayout = (sizes: number[]) => {
    if (t) {
      window.clearTimeout(t);
    }

    t = window.setTimeout(() => {
      setCookie("react-resizable-panels:layout", sizes);
    }, 150);
  };

  return (
    <ResizablePanelGroup direction="horizontal" onLayout={onLayout}>
      <ResizablePanel defaultSize={props.defaultLayout[0]} minSize={25} order={1}>
        <ChatPane />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={props.defaultLayout[1]} minSize={25} order={2}>
        <PreviewPane />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
