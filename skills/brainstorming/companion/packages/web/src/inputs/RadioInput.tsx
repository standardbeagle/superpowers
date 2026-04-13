export function RadioInput({ def, value, onChange }: { def: any; value: unknown; onChange: (v: string) => void }) {
  const options = def.options.map((o: any) => typeof o === "string" ? { value: o, label: o } : o);
  return (
    <fieldset>
      <legend>{def.label ?? def.name}</legend>
      {options.map((o: any) => (
        <label key={o.value} style={{ display: "block", fontWeight: 400 }}>
          <input type="radio" name={def.name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} /> {o.label}
        </label>
      ))}
    </fieldset>
  );
}
