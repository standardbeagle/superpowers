import { useState } from "preact/hooks";
import { useRefresh } from "../lib/sse";

export function Activity() {
  const [events, setEvents] = useState<Array<{ kind: string; id: string; ts: number }>>([]);
  useRefresh((ev) => setEvents(prev => [{ kind: ev.kind, id: ev.id, ts: Date.now() }, ...prev].slice(0, 20)));
  return (
    <div class="activity-list">
      <h4>Recent</h4>
      <ul>
        {events.map((e, i) => (
          <li key={i}>{new Date(e.ts).toLocaleTimeString()} — {e.kind}:{e.id}</li>
        ))}
      </ul>
    </div>
  );
}
