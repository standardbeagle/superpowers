import { useShutdownState } from "../lib/sse";

export function EndedView() {
  const { phase, reason } = useShutdownState();
  const isEnded = phase === "ended";
  return (
    <div class="ended-view">
      <div class="ended-card">
        <h1>{isEnded ? "Session ended" : "Shutting down…"}</h1>
        {isEnded ? (
          <>
            <p class="muted">{reason ?? "The companion server has exited."}</p>
            <p class="muted">You can close this window.</p>
          </>
        ) : (
          <>
            <div class="ended-spinner" aria-hidden="true" />
            <p class="muted">{reason ?? "The server is finishing up."}</p>
          </>
        )}
      </div>
    </div>
  );
}
