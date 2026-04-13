export function CodeInput({ def }: { def: any; value: unknown; onChange: (v: string) => void }) {
  return <div><label>{def.label ?? def.name}</label><p class="muted">Code editor loads in a later task.</p></div>;
}
