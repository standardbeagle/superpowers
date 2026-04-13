import { useEffect, useState } from "preact/hooks";
import { getScreen, updateDecision } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";

export function DecisionView({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<any>(null);
  const [chosen, setChosen] = useState<string>("");
  const [note, setNote] = useState<string>("");

  useEffect(() => { void getScreen(params.id).then(setScreen); }, [params.id]);
  if (!screen) return <p>Loading…</p>;
  const fm = screen.frontmatter;
  if (fm.kind !== "decision") return <p>Wrong kind.</p>;

  async function submit(status: "approved"|"revised"|"rejected") {
    await updateDecision(fm.id, status, chosen || undefined, note || undefined);
  }

  return (
    <article>
      <h2>{fm.title}</h2>
      <p><span class={`badge badge-${fm.status}`} /> status: <strong>{fm.status}</strong></p>
      <div class="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(screen.body) }} />
      <fieldset style={{ marginTop: 16 }}>
        <legend>Options</legend>
        {fm.options.map((o: any) => (
          <label key={o.id} style={{ display: "block", fontWeight: 400 }}>
            <input type="radio" name="opt" value={o.id} checked={chosen === o.id} onChange={() => setChosen(o.id)} /> {o.label}{o.recommended ? " ⭐" : ""}
          </label>
        ))}
      </fieldset>
      <textarea placeholder="Note (required for revise/reject)" value={note} onInput={(e: any) => setNote(e.currentTarget.value)} style={{ marginTop: 8 }} />
      <div class="actions" style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button onClick={() => submit("approved")}>Approve</button>
        <button onClick={() => submit("revised")}>Revise</button>
        <button onClick={() => submit("rejected")}>Reject</button>
      </div>
    </article>
  );
}
