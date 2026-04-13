import { z } from "zod";

export const InputDef = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("radio"),
    name: z.string().min(1),
    label: z.string().optional(),
    options: z.array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })])).min(2),
    private: z.literal(false).optional(),
  }),
  z.object({
    type: z.literal("multi"),
    name: z.string().min(1),
    label: z.string().optional(),
    options: z.array(z.union([z.string(), z.object({ value: z.string(), label: z.string() })])).min(2),
    private: z.literal(false).optional(),
  }),
  z.object({
    type: z.literal("text"),
    name: z.string().min(1),
    label: z.string().optional(),
    multiline: z.boolean().default(false),
    placeholder: z.string().optional(),
    private: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("code"),
    name: z.string().min(1),
    label: z.string().optional(),
    language: z.string().default("text"),
    placeholder: z.string().optional(),
    private: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("file-edit"),
    name: z.string().min(1).optional(),
    path: z.string().min(1),
    language: z.string().optional(),
    private: z.literal(true),
  }),
]);
export type InputDef = z.infer<typeof InputDef>;

export const QuestionScreen = z.object({
  kind: z.literal("question"),
  id: z.string().min(1),
  title: z.string().min(1),
  pinned: z.boolean().default(false),
  inputs: z.array(InputDef).min(1),
});

export const DemoScreen = z.object({
  kind: z.literal("demo"),
  id: z.string().min(1),
  title: z.string().min(1),
  pinned: z.boolean().default(false),
  demo: z.object({
    type: z.literal("srcdoc"),
    html: z.string().optional(),
    css: z.string().optional(),
    js: z.string().optional(),
    inlineHtml: z.string().optional(),
    inlineCss: z.string().optional(),
    inlineJs: z.string().optional(),
    viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).default({ width: 480, height: 720 }),
  }).refine(d => d.html || d.inlineHtml, { message: "demo requires html path or inlineHtml" }),
  actions: z.array(z.object({
    type: z.enum(["approve", "revise", "reject"]),
    label: z.string().min(1),
    requires_note: z.boolean().default(false),
  })).min(1),
});

export const DecisionOption = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  recommended: z.boolean().default(false),
});

export const DecisionScreen = z.object({
  kind: z.literal("decision"),
  id: z.string().min(1),
  title: z.string().min(1),
  pinned: z.boolean().default(false),
  status: z.enum(["proposed", "approved", "revised", "rejected"]).default("proposed"),
  options: z.array(DecisionOption).min(2),
  depends_on: z.array(z.string()).default([]),
  chosen_option: z.string().optional(),
  note: z.string().optional(),
});

export const ScreenFrontmatter = z.discriminatedUnion("kind", [QuestionScreen, DemoScreen, DecisionScreen]);
export type ScreenFrontmatter = z.infer<typeof ScreenFrontmatter>;

export interface Screen {
  frontmatter: ScreenFrontmatter;
  body: string;
  path: string;
}
