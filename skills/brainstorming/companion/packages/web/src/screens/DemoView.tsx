import { useEffect, useRef, useState } from "preact/hooks";
import { getScreen } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { renderAllMermaidBlocks } from "../lib/mermaid";

export function DemoView({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<any>(null);
  const [html, setHtml] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void getScreen(params.id).then(setScreen); }, [params.id]);

  useEffect(() => {
    if (!screen || screen.frontmatter.kind !== "demo") return;
    const { demo } = screen.frontmatter;
    (async () => {
      const htmlBody = demo.inlineHtml ?? await (await fetch(`/api/demo-asset?screen_id=${params.id}&file=${encodeURIComponent(demo.html)}`)).text();
      const css = demo.css ? await (await fetch(`/api/demo-asset?screen_id=${params.id}&file=${encodeURIComponent(demo.css)}`)).text() : "";
      const js  = demo.js  ? await (await fetch(`/api/demo-asset?screen_id=${params.id}&file=${encodeURIComponent(demo.js)}`)).text()  : "";
      const bridge = `
        <script>
          window.__emit = (name, data) =>
            window.parent.postMessage({ kind: "demo_event", name, data }, "*");
        </script>`;
      setHtml(`<!doctype html><html><head><style>${css}</style></head><body>${htmlBody}${bridge}<script>${js}</script></body></html>`);
    })();
  }, [screen?.frontmatter?.id]);

  useEffect(() => { if (bodyRef.current) void renderAllMermaidBlocks(bodyRef.current); }, [screen?.frontmatter?.id]);

  useEffect(() => {
    function listener(e: MessageEvent) {
      if (!e.data || e.data.kind !== "demo_event") return;
      void fetch("/api/demo-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ screen_id: params.id, name: e.data.name, data: e.data.data }),
      });
    }
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [params.id]);

  if (!screen) return <p>Loading…</p>;
  const fm = screen.frontmatter;
  if (fm.kind !== "demo") return <p>Wrong kind.</p>;

  async function act(type: "approve"|"revise"|"reject") {
    await fetch("/api/demo-event", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ screen_id: params.id, name: type, data: { note } }),
    });
  }

  return (
    <article>
      <h2>{fm.title}</h2>
      <div class="markdown" ref={bodyRef} dangerouslySetInnerHTML={{ __html: renderMarkdown(screen.body) }} />
      <iframe
        class="demo-frame"
        sandbox="allow-scripts"
        srcDoc={html}
        style={{ width: fm.demo.viewport.width, height: fm.demo.viewport.height, border: "1px solid var(--border)", borderRadius: 6 }}
      />
      <div class="actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
        {fm.actions.map((a: any) =>
          <button key={a.type} onClick={() => act(a.type)}>{a.label}</button>)}
      </div>
      <textarea placeholder="Note (for revise/reject)" value={note} onInput={(e: any) => setNote(e.currentTarget.value)} style={{ marginTop: 8 }} />
    </article>
  );
}
