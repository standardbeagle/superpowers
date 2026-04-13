import { useEffect, useRef, useState } from "preact/hooks";

export interface RefreshEvent { kind: "screen"|"decision"; id: string; action?: string; }

type Listener = (ev: RefreshEvent) => void;

export type ShutdownPhase = "live" | "shutting_down" | "ended";
export interface ShutdownState {
  phase: ShutdownPhase;
  reason: string | null;
}

const SHUTDOWN_KEY = "__companion_shutdown";

let ws: WebSocket | null = null;
let reconnectTimer: number | null = null;
const listeners = new Set<Listener>();

const shutdownListeners = new Set<(s: ShutdownState) => void>();
let shutdownState: ShutdownState = readPersistedShutdown() ?? { phase: "live", reason: null };

function readPersistedShutdown(): ShutdownState | null {
  try {
    const raw = sessionStorage.getItem(SHUTDOWN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { phase?: ShutdownPhase; reason?: string | null };
    if (parsed.phase === "shutting_down" || parsed.phase === "ended") {
      return { phase: parsed.phase, reason: parsed.reason ?? null };
    }
  } catch { /* ignore */ }
  return null;
}

function writePersistedShutdown(next: ShutdownState) {
  try {
    if (next.phase === "live") sessionStorage.removeItem(SHUTDOWN_KEY);
    else sessionStorage.setItem(SHUTDOWN_KEY, JSON.stringify({ phase: next.phase, reason: next.reason }));
  } catch { /* ignore */ }
}

function setShutdownState(next: ShutdownState) {
  shutdownState = next;
  writePersistedShutdown(next);
  shutdownListeners.forEach(l => l(next));
}

function url() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/api/stream`;
}

function ensure() {
  if (shutdownState.phase !== "live") return; // never reconnect after shutdown
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  ws = new WebSocket(url());
  ws.addEventListener("message", (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (!msg) return;
      if (msg.event === "refresh" && msg.data) {
        listeners.forEach(l => l(msg.data as RefreshEvent));
      } else if (msg.event === "shutdown") {
        const reason = (msg.data && msg.data.reason) || "stopped";
        setShutdownState({ phase: "shutting_down", reason });
      }
    } catch { /* ignore malformed frame */ }
  });
  const onClose = () => {
    ws = null;
    // If we already saw a shutdown frame, move to "ended" instead of reconnecting.
    if (shutdownState.phase === "shutting_down") {
      setShutdownState({ phase: "ended", reason: shutdownState.reason });
      return;
    }
    if (shutdownState.phase === "ended") return;
    if (reconnectTimer !== null) return;
    if (listeners.size === 0) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      ensure();
    }, 1000);
  };
  ws.addEventListener("close", onClose);
  ws.addEventListener("error", onClose);
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

export function useShutdownState(): ShutdownState {
  const [state, setState] = useState<ShutdownState>(shutdownState);
  useEffect(() => {
    setState(shutdownState);
    const listener = (next: ShutdownState) => setState(next);
    shutdownListeners.add(listener);
    return () => { shutdownListeners.delete(listener); };
  }, []);
  return state;
}

export function useTick(): number {
  const [tick, setTick] = useState(0);
  useRefresh(() => setTick(t => t + 1));
  return tick;
}
