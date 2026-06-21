import { useEffect, useRef, useState } from "preact/hooks";
import { createEditor } from "../lib/codemirror";
import { privateSave } from "../lib/api";

export function FileEditInput({ def, screenId }: { def: any; screenId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const valueRef = useRef<string>("");

  useEffect(() => {
    if (!hostRef.current) return;
    let destroy: (() => void) | undefined;
    void createEditor(hostRef.current, "", def.language ?? "text", v => { valueRef.current = v; }).then(view => {
      destroy = () => view.destroy();
    });
    return () => destroy?.();
  }, []);

  async function save() {
    setStatus("saving");
    try {
      await privateSave(screenId, def.name ?? def.path, def.path, valueRef.current);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div class="file-edit">
      <label>
        Edit <code>{def.path}</code> <span class="badge-private">private</span>
      </label>
      <p class="muted">Contents are written directly to the target path. They are never sent through the answer channel and never appear in events.jsonl.</p>
      <div class="cm-host" ref={hostRef} />
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <button type="button" onClick={save} disabled={status === "saving"}>Save</button>
        <span class="muted">{status}</span>
      </div>
    </div>
  );
}
