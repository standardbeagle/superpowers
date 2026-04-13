import { useEffect, useState } from "preact/hooks";

export interface RefreshEvent { kind: "screen"|"decision"; id: string; action?: string; }

export function useRefresh(onEvent: (ev: RefreshEvent) => void) {
  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("refresh", (e: MessageEvent) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    });
    return () => es.close();
  }, []);
}

export function useTick(): number {
  const [tick, setTick] = useState(0);
  useRefresh(() => setTick(t => t + 1));
  return tick;
}
