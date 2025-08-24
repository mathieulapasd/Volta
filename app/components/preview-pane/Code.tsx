"use client";

import { html as htmlLang } from "@codemirror/lang-html";
import dynamic from "next/dynamic";
import { useDraftStore } from "@/lib/store/useDraftStore";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

export default function Code() {
  const draft = useDraftStore((s) => s.draft);
  const updateDraftHtml = useDraftStore((s) => s.updateDraftHtml);

  const onHtmlCodeChange = (val: string) => {
    updateDraftHtml(val);
  };

  return (
    <CodeMirror
      value={draft?.html_inline}
      height="100%"
      extensions={[htmlLang()]}
      onChange={onHtmlCodeChange}
      basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
    />
  );
}
