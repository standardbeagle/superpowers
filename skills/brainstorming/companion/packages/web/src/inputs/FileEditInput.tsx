export function FileEditInput({ def }: { def: any; screenId: string }) {
  return <div><label>Edit <code>{def.path}</code></label><p class="muted">File editor loads in a later task.</p></div>;
}
