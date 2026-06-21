export function TextInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string) => void }) {
  const v = typeof value === "string" ? value : "";
  return (
    <div>
      <label>{def.label ?? def.name}</label>
      {def.multiline
        ? <textarea placeholder={def.placeholder} value={v} onInput={(e: any) => onChange(e.currentTarget.value)} />
        : <input    type="text" placeholder={def.placeholder} value={v} onInput={(e: any) => onChange(e.currentTarget.value)} />}
    </div>
  );
}
