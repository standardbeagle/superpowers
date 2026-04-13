import type { ComponentChildren } from "preact";

export function Shell({ children }: { children: ComponentChildren }) {
  return (
    <div class="shell">
      <aside class="sidebar">Sidebar</aside>
      <main class="main">{children}</main>
      <aside class="activity">Activity</aside>
    </div>
  );
}
