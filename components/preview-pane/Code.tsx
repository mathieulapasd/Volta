"use client";

import { html as htmlLang } from "@codemirror/lang-html";
import dynamic from "next/dynamic";
import type { RefObject } from "react";
import { useDraftStore } from "@/lib/store/useDraftStore";

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), { ssr: false });

interface CodeProps {
  codeMirrorDebounceRef: RefObject<number | undefined>;
  latestHtmlRef: RefObject<string>;
}

export default function Code(props: CodeProps) {
  const htmlCode = useDraftStore((s) => s.htmlCode);
  const setHtmlCode = useDraftStore((s) => s.setHtmlCode);

  const onHtmlCodeChange = (val: string) => {
    if (props.codeMirrorDebounceRef.current) {
      window.clearTimeout(props.codeMirrorDebounceRef.current);
    }

    props.latestHtmlRef.current = val;

    props.codeMirrorDebounceRef.current = window.setTimeout(() => {
      setHtmlCode(val);
    }, 200);
  };

  return (
    <CodeMirror
      value={htmlCode}
      height="100%"
      extensions={[htmlLang()]}
      onChange={onHtmlCodeChange}
      basicSetup={{ lineNumbers: true, highlightActiveLine: true }}
    />
  );
}
