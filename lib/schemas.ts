import { z } from "zod";

const attributeEnum = z.enum([
  "text",
  "src",
  "href",
  "alt",
  "bgcolor",
  "color",
  "width",
  "height",
  "target",
  "fontSize",
  "fontWeight",
  "textAlign",
  "lineHeight",
  "padding",
  "borderRadius",
]);

export const emailMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.iso.datetime(),
});

const emailBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "image", "button", "section"]),
  selector: z.string(), // CSS selector using [data-id]
  editable: z.array(attributeEnum),
  label: z.string().optional(),
});

export const emailDraftSchema = z.object({
  html_inline: z.string(),
  manifest: z.object({
    blocks: z.array(emailBlockSchema),
  }),
});

export type EmailMessage = z.infer<typeof emailMessageSchema>;
export type EmailBlock = z.infer<typeof emailBlockSchema>;
export type EmailDraft = z.infer<typeof emailDraftSchema>;
export type AttributeName = z.infer<typeof attributeEnum>;
