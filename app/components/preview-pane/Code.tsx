"use client";

import { css as cssLang } from "@codemirror/lang-css";
import { html as htmlLang } from "@codemirror/lang-html";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDraftStore } from "@/lib/store/useDraftStore";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

export default function Code() {
  const draft = useDraftStore((s) => s.draft);
  const updateDraftHtml = useDraftStore((s) => s.updateDraftHtml);
  const updateDraftCss = useDraftStore((s) => s.updateDraftCss);

  const [activeTab, setActiveTab] = useState<"html" | "css">("html");

  const onHtmlCodeChange = (val: string) => {
    updateDraftHtml(val);
  };

  const onCssCodeChange = (val: string) => {
    updateDraftCss(val);
  };

  const editorHeight = useMemo(() => "calc(100% - 40px)", []);

  return (
    <div className="size-full">
      <div className="mb-2 flex gap-2">
        <Button variant={activeTab === "html" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("html")}>
          HTML
        </Button>
        <Button variant={activeTab === "css" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("css")}>
          CSS
        </Button>
      </div>

      {activeTab === "html" ? (
        <CodeMirror
          key="html"
          value={draft?.html_inline}
          height={editorHeight}
          extensions={[htmlLang()]}
          onChange={onHtmlCodeChange}
          basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
        />
      ) : (
        <CodeMirror
          key="css"
          value={draft?.css_inline}
          height={editorHeight}
          extensions={[cssLang()]}
          onChange={onCssCodeChange}
          basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
        />
      )}
    </div>
  );
}
