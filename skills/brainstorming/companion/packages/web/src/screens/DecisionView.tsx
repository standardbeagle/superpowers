import { useEffect, useRef, useState } from "preact/hooks";
import { getDecision, updateDecision, listDecisions, type DecisionSummary } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { renderAllMermaidBlocks } from "../lib/mermaid";

export function DecisionView({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<any>(null);
  const [all, setAll] = useState<DecisionSummary[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScreen(null);
    setChosen("");
    setNote("");
    setJustSubmitted(false);
    void getDecision(params.id).then(setScreen);
    void listDecisions().then(setAll);
  }, [params.id]);
  useEffect(() => { if (bodyRef.current) void renderAllMermaidBlocks(bodyRef.current); }, [screen?.frontmatter?.id]);
  if (!screen) return <p>Loading…</p>;
  const fm = screen.frontmatter;
  if (fm.kind !== "decision") return <p>Wrong kind.</p>;

  const parents: DecisionSummary[] = (fm.depends_on ?? [])
    .map((id: string) => all.find(d => d.id === id))
    .filter((d: DecisionSummary | undefined): d is DecisionSummary => !!d);

  const dependents = all.filter(d =>
    Array.isArray(d.depends_on) && d.depends_on.includes(fm.id) && d.status === "proposed"
  );
  const nextUp = dependents[0];

  async function submit(status: "approved"|"revised"|"rejected") {
    await updateDecision(fm.id, status, chosen || undefined, note || undefined);
    setJustSubmitted(true);
    // Refresh list so status badges update in the parent panel when navigating back
    void listDecisions().then(setAll);
  }

  return (
    <article class="decision-view">
      <h2>{fm.title}</h2>
      <p><span class={`badge badge-${fm.status}`} /> status: <strong>{fm.status}</strong></p>

      {parents.length > 0 && (
        <section class="parent-panel" aria-label="Parent decisions">
          <h4>Depends on</h4>
          <ul>
            {parents.map(p => (
              <li key={p.id} class="parent-card" data-status={p.status}>
                <div class="parent-head">
                  <span class={`badge badge-${p.status}`} />
                  <a href={`/decisions/${p.id}`}>{p.title}</a>
                  <span class="parent-status">{p.status}</span>
                </div>
                {p.status === "proposed" ? (
                  <p class="muted">Waiting on this decision.</p>
                ) : (
                  <>
                    {p.chosen_option && (
                      <p class="parent-chosen">
                        Chose: <strong>{labelFor(all, p.id, p.chosen_option)}</strong>
                      </p>
                    )}
                    {p.note && <p class="parent-note"><em>"{p.note}"</em></p>}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div class="markdown" ref={bodyRef} dangerouslySetInnerHTML={{ __html: renderMarkdown(screen.body) }} />

      <fieldset style={{ marginTop: 16 }}>
        <legend>Options</legend>
        {fm.options.map((o: any) => (
          <label key={o.id} class="option">
            <input type="radio" name="opt" value={o.id} checked={chosen === o.id} onChange={() => setChosen(o.id)} />
            <span>{o.label}{o.recommended ? " ⭐" : ""}</span>
          </label>
        ))}
      </fieldset>
      <textarea placeholder="Note (required for revise/reject)" value={note} onInput={(e: any) => setNote(e.currentTarget.value)} style={{ marginTop: 8 }} />
      <div class="actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => submit("approved")}>Approve</button>
        <button onClick={() => submit("revised")}>Revise</button>
        <button onClick={() => submit("rejected")}>Reject</button>
      </div>

      {justSubmitted && (
        <div class="next-up">
          {nextUp ? (
            <a class="next-up-btn" href={`/decisions/${nextUp.id}`}>
              Next: {nextUp.title} →
            </a>
          ) : (
            <p class="muted">Done with this branch.</p>
          )}
        </div>
      )}
    </article>
  );
}

// Map a chosen_option id to its label by walking the parent decision's options list.
// The /api/decisions list summary does not carry `options`, so we fall back to the raw id
// if we cannot resolve the label. Good enough for v1.
function labelFor(_all: DecisionSummary[], _parentId: string, chosen: string): string {
  return chosen;
}
