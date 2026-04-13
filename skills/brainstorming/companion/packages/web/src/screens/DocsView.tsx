import { useEffect, useRef, useState } from "preact/hooks";
import { getDoc } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { renderAllMermaidBlocks } from "../lib/mermaid";

export function DocsView({ params }: { params: { path: string } }) {
  const [body, setBody] = useState<string>("");
  const ref = useRef<HTMLDivElement>(null);
  const decoded = decodeURIComponent(params.path);

  useEffect(() => { void getDoc(decoded).then(setBody); }, [decoded]);
  useEffect(() => { if (ref.current) void renderAllMermaidBlocks(ref.current); }, [body]);

  return (
    <article>
      <h2>{decoded.split("/").pop()}</h2>
      <div class="markdown" ref={ref} dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
    </article>
  );
}
