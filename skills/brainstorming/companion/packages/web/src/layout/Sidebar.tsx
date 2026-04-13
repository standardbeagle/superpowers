import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { listScreens, listDecisions, listDocs, type ScreenSummary, type DecisionSummary, type DocEntry } from "../lib/api";
import { useRefresh } from "../lib/sse";

export function Sidebar() {
  const [screens, setScreens] = useState<ScreenSummary[]>([]);
  const [decisions, setDecisions] = useState<DecisionSummary[]>([]);
  const [docs, setDocs] = useState<DocEntry[]>([]);

  async function refresh() {
    setScreens(await listScreens());
    setDecisions(await listDecisions());
    setDocs(await listDocs());
  }
  useEffect(() => { void refresh(); }, []);
  useRefresh(() => { void refresh(); });

  return (
    <nav class="sidebar-nav">
      <a href="/help" class="sidebar-item sidebar-help">? Help</a>
      <Section title="Screens">
        {screens.map(s => (
          <a
            key={s.id}
            href={s.kind === "demo" ? `/demo/${s.id}` : s.kind === "decision" ? `/decisions/${s.id}` : `/screen/${s.id}`}
            class="sidebar-item"
            data-kind={s.kind}
          >
            <span class="dot" /> {s.title}
          </a>
        ))}
      </Section>
      <Section title="Decisions">
        {decisions.map(d => (
          <a key={d.id} href={`/decisions/${d.id}`} class="sidebar-item" data-status={d.status}>
            <span class={`badge badge-${d.status}`} /> {d.title}
          </a>
        ))}
      </Section>
      <Section title="Docs">
        {docs.map(d => (
          <a key={d.path} href={`/docs/${encodeURIComponent(d.path)}`} class="sidebar-item">
            {d.rel}
          </a>
        ))}
      </Section>
    </nav>
  );
}

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="sidebar-section">
      <h4 class="sidebar-heading">{title}</h4>
      <div class="sidebar-list">{children}</div>
    </section>
  );
}
