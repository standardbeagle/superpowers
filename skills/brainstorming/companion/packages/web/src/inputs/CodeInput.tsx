import { useEffect, useRef } from "preact/hooks";
import { createEditor } from "../lib/codemirror";

export function CodeInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hostRef.current) return;
    let destroy: (() => void) | undefined;
    void createEditor(hostRef.current, typeof value === "string" ? value : "", def.language, onChange).then(view => {
      destroy = () => view.destroy();
    });
    return () => destroy?.();
  }, []);
  return (
    <div>
      <label>{def.label ?? def.name} <span class="muted">({def.language})</span></label>
      <div class="cm-host" ref={hostRef} />
    </div>
  );
}
