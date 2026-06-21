export interface IdempotencyStore {
  seen(screenId: string, clientId: string): boolean;
  remember(screenId: string, clientId: string): void;
}
export function createIdempotencyStore(maxEntries = 1024): IdempotencyStore {
  const set = new Set<string>();
  const order: string[] = [];
  const key = (s: string, c: string) => `${s}::${c}`;
  return {
    seen: (s, c) => set.has(key(s, c)),
    remember: (s, c) => {
      const k = key(s, c);
      if (set.has(k)) return;
      set.add(k);
      order.push(k);
      if (order.length > maxEntries) {
        const old = order.shift()!;
        set.delete(old);
      }
    },
  };
}
