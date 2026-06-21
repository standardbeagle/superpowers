export function MultiInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string[]) => void }) {
  const options = def.options.map((o: any) => typeof o === "string" ? { value: o, label: o } : o);
  const arr = Array.isArray(value) ? value as string[] : [];
  function toggle(v: string) {
    onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  }
  return (
    <fieldset>
      <legend>{def.label ?? def.name}</legend>
      {options.map((o: any) => (
        <label key={o.value} class="option">
          <input type="checkbox" checked={arr.includes(o.value)} onChange={() => toggle(o.value)} />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
