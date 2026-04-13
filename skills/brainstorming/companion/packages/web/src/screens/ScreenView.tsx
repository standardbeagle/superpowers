import { useEffect, useState } from "preact/hooks";
import { getScreen, submitAnswer } from "../lib/api";
import { renderMarkdown } from "../lib/markdown";
import { RadioInput } from "../inputs/RadioInput";
import { MultiInput } from "../inputs/MultiInput";
import { TextInput } from "../inputs/TextInput";
import { CodeInput } from "../inputs/CodeInput";
import { FileEditInput } from "../inputs/FileEditInput";

export function ScreenView({ params }: { params: { id: string } }) {
  const [screen, setScreen] = useState<any>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { void getScreen(params.id).then(setScreen); }, [params.id]);
  if (!screen) return <p>Loading…</p>;
  const { frontmatter: fm, body } = screen;
  if (fm.kind !== "question") return <p>Wrong kind for this view.</p>;

  function setValue(name: string, v: unknown) { setValues(prev => ({ ...prev, [name]: v })); }

  async function onSubmit(e: Event) {
    e.preventDefault();
    await submitAnswer(fm.id, values);
    setSubmitted(true);
  }

  return (
    <article class="screen">
      <h2>{fm.title}</h2>
      <div class="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
      <form onSubmit={onSubmit} class="screen-form">
        {fm.inputs.map((def: any) => {
          switch (def.type) {
            case "radio": return <RadioInput key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "multi": return <MultiInput key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "text":  return <TextInput  key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "code":  return <CodeInput  key={def.name} def={def} value={values[def.name]} onChange={v => setValue(def.name, v)} />;
            case "file-edit": return <FileEditInput key={def.path} def={def} screenId={fm.id} />;
            default: return null;
          }
        })}
        <button type="submit" disabled={submitted}>{submitted ? "Submitted" : "Submit"}</button>
      </form>
    </article>
  );
}
