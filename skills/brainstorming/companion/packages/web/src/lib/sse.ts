import { useEffect, useRef, useState } from "preact/hooks";

export interface RefreshEvent { kind: "screen"|"decision"; id: string; action?: string; }

type Listener = (ev: RefreshEvent) => void;

let es: EventSource | null = null;
const listeners = new Set<Listener>();

function ensure() {
  if (es) return;
  es = new EventSource("/api/stream");
  es.addEventListener("refresh", (e: MessageEvent) => {
    try {
      const parsed = JSON.parse(e.data) as RefreshEvent;
      listeners.forEach(l => l(parsed));
    } catch { /* ignore malformed payload */ }
  });
  es.addEventListener("error", () => {
    // Let the browser retry via its built-in EventSource reconnect behaviour.
  });
}

export function useRefresh(onEvent: Listener) {
  const latest = useRef(onEvent);
  useEffect(() => { latest.current = onEvent; });
  useEffect(() => {
    ensure();
    const wrapper: Listener = (ev) => latest.current(ev);
    listeners.add(wrapper);
    return () => { listeners.delete(wrapper); };
  }, []);
}

export function useTick(): number {
  const [tick, setTick] = useState(0);
  useRefresh(() => setTick(t => t + 1));
  return tick;
}
