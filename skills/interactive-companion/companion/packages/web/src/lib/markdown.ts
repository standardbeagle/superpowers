import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

export function renderMarkdown(body: string): string {
  return md.render(body);
}
