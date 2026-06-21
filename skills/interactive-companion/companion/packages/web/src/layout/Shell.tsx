import type { ComponentChildren } from "preact";
import { Sidebar } from "./Sidebar";
import { Activity } from "./Activity";

export function Shell({ children }: { children: ComponentChildren }) {
  return (
    <div class="shell">
      <aside class="sidebar"><Sidebar /></aside>
      <main class="main">{children}</main>
      <aside class="activity"><Activity /></aside>
    </div>
  );
}
