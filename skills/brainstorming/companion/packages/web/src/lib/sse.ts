import { useEffect, useRef, useState } from "preact/hooks";

export interface RefreshEvent { kind: "screen"|"decision"; id: string; action?: string; }

type Listener = (ev: RefreshEvent) => void;

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
const listeners = new Set<Listener>();

function url() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/api/stream`;
}

function ensure() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  ws = new WebSocket(url());
  ws.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg && msg.event === "refresh" && msg.data) {
        listeners.forEach(l => l(msg.data as RefreshEvent));
      }
    } catch { /* ignore malformed frame */ }
  });
  const reconnect = () => {
    ws = null;
    if (reconnectTimer !== null) return;
    if (listeners.size === 0) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      ensure();
    }, 1000);
  };
  ws.addEventListener("close", reconnect);
  ws.addEventListener("error", reconnect);
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
