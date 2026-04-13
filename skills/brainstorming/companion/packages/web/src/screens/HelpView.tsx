import { useEffect, useRef, useState } from "preact/hooks";
import { renderMarkdown } from "../lib/markdown";
import { renderAllMermaidBlocks } from "../lib/mermaid";

export function HelpView() {
  const [body, setBody] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { void fetch("/api/help").then(r => r.text()).then(setBody); }, []);
  useEffect(() => { if (ref.current) void renderAllMermaidBlocks(ref.current); }, [body]);
  return (
    <article>
      <h2>Help — Screen Format Reference</h2>
      <div class="markdown" ref={ref} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
    </article>
  );
}
