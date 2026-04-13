export interface SseHub {
  handle(req: Request): Response;
  push(event: string, data: unknown): void;
  close(): void;
}

export function createSseHub(): SseHub {
  const encoder = new TextEncoder();
  const clients = new Set<WritableStreamDefaultWriter<Uint8Array>>();

  return {
    handle(): Response {
      const ts = new TransformStream<Uint8Array, Uint8Array>();
      const writer = ts.writable.getWriter();
      clients.add(writer);
      writer.write(encoder.encode(": connected\n\n")).catch(() => {});
      const abort = () => { clients.delete(writer); writer.close().catch(() => {}); };
      writer.closed.then(abort, abort);
      return new Response(ts.readable, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "connection": "keep-alive",
        },
      });
    },
    push(event, data) {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      const bytes = encoder.encode(payload);
      for (const w of clients) w.write(bytes).catch(() => clients.delete(w));
    },
    close() {
      for (const w of clients) w.close().catch(() => {});
      clients.clear();
    },
  };
}
