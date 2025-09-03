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

const globalAttributeEnum = z.enum(["font", "primaryColor"]);

export const fontEnum = z.enum(["arial", "helvetica", "times-new-roman", "courier-new", "verdana"]);

export type FontEnum = z.infer<typeof fontEnum>;

export const fontToCssMap: Record<FontEnum, string> = {
  arial: "Arial, Helvetica, sans-serif",
  helvetica: "Helvetica, Arial, sans-serif",
  "times-new-roman": '"Times New Roman", Times, serif',
  "courier-new": '"Courier New", Courier, monospace',
  verdana: "Verdana, Geneva, sans-serif",
};

export const fontToLabelMap: Record<FontEnum, string> = {
  arial: "Arial",
  helvetica: "Helvetica",
  "times-new-roman": "Times New Roman",
  "courier-new": "Courier New",
  verdana: "Verdana",
};

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
  config: z.object({
    font: fontEnum.default("arial"),
    primaryColor: z.string().default("#007bff"),
  }),
  assets: z
    .array(
      z.object({
        id: z.string(),
        filename: z.string(),
        mimeType: z.string(),
        dataUrl: z.string(),
      })
    )
    .default([]),
});

export type EmailMessage = z.infer<typeof emailMessageSchema>;
export type EmailBlock = z.infer<typeof emailBlockSchema>;
export type EmailDraft = z.infer<typeof emailDraftSchema>;
export type AttributeName = z.infer<typeof attributeEnum>;
export type GlobalAttributeName = z.infer<typeof globalAttributeEnum>;
export type EmailAsset = EmailDraft["assets"][number];
