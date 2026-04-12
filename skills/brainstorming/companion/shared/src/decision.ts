import { z } from "zod";

export const DecisionStatus = z.enum(["proposed", "approved", "revised", "rejected"]);
export type DecisionStatus = z.infer<typeof DecisionStatus>;

export const Decision = z.object({
  id: z.string(),
  title: z.string(),
  status: DecisionStatus,
  chosen_option: z.string().optional(),
  note: z.string().optional(),
  path: z.string(),
});
export type Decision = z.infer<typeof Decision>;
