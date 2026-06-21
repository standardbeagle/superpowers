import { z } from "zod";
import { DecisionStatus } from "./decision";

const Base = z.object({
  ts: z.number().int().nonnegative(),
  seq: z.number().int().nonnegative(),
  screen_id: z.string().optional(),
});

export const Event = z.discriminatedUnion("type", [
  Base.extend({ type: z.literal("answer"), inputs: z.record(z.any()) }),
  Base.extend({ type: z.literal("saved"), name: z.string(), path: z.string(), bytes: z.number().int(), sha256: z.string() }),
  Base.extend({ type: z.literal("demo_event"), name: z.string(), data: z.any().optional() }),
  Base.extend({ type: z.literal("demo_event_throttled"), dropped: z.number().int().nonnegative() }),
  Base.extend({ type: z.literal("decision"), id: z.string(), status: DecisionStatus, chosen_option: z.string().optional(), note: z.string().optional() }),
  Base.extend({ type: z.literal("navigate"), to: z.string(), from: z.string().optional() }),
  Base.extend({ type: z.literal("screen_error"), path: z.string(), message: z.string() }),
  Base.extend({ type: z.literal("save_error"), name: z.string(), path: z.string(), errno: z.string() }),
  Base.extend({ type: z.literal("server_ready"), url: z.string(), port: z.number().int(), pid: z.number().int() }),
  Base.extend({ type: z.literal("server_stopped"), reason: z.string() }),
]);
export type Event = z.infer<typeof Event>;
