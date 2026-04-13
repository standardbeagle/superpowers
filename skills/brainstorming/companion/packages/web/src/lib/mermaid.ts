let mermaidPromise: Promise<typeof import("mermaid").default> | undefined;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then(m => {
      m.default.initialize({ startOnLoad: false, theme: "dark" });
      return m.default;
    });
  }
  return mermaidPromise;
}

export async function renderAllMermaidBlocks(root: HTMLElement): Promise<void> {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("pre > code.language-mermaid"));
  if (blocks.length === 0) return;
  const mermaid = await loadMermaid();
  for (let i = 0; i < blocks.length; i++) {
    const code = blocks[i]!;
    const src = code.textContent ?? "";
    const id = `mmd-${Date.now()}-${i}`;
    const { svg } = await mermaid.render(id, src);
    const host = document.createElement("div");
    host.className = "mermaid-rendered";
    host.innerHTML = svg;
    code.parentElement!.replaceWith(host);
  }
}
