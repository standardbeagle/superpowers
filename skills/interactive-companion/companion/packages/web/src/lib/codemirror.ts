export async function createEditor(parent: HTMLElement, value: string, language: string, onChange: (v: string) => void) {
  const [{ EditorState }, { EditorView, keymap, lineNumbers }, { defaultKeymap }, { syntaxHighlighting, defaultHighlightStyle }] = await Promise.all([
    import("@codemirror/state"),
    import("@codemirror/view"),
    import("@codemirror/commands"),
    import("@codemirror/language"),
  ]);

  let lang: any;
  switch (language) {
    case "json":       lang = (await import("@codemirror/lang-json")).json(); break;
    case "yaml":       lang = (await import("@codemirror/lang-yaml")).yaml(); break;
    case "js":
    case "ts":
    case "javascript":
    case "typescript": lang = (await import("@codemirror/lang-javascript")).javascript({ typescript: language.includes("ts") }); break;
    default: lang = [];
  }

  const state = EditorState.create({
    doc: value,
    extensions: [
      lineNumbers(),
      keymap.of(defaultKeymap),
      syntaxHighlighting(defaultHighlightStyle),
      lang,
      EditorView.updateListener.of(u => { if (u.docChanged) onChange(u.state.doc.toString()); }),
    ],
  });
  return new EditorView({ state, parent });
}
