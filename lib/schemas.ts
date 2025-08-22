import { z } from "zod"

const attributeEnum = z.enum(["text", "src", "href", "alt", "bgcolor", "color"]);

export const emailMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.iso.datetime(),
})

export const emailAssetSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mime: z.string(),
  source: z.string(), // data URL or remote URL
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

export const emailBlockSchema = z.object({
  id: z.string(),
  type: z.enum(["text", "image", "button", "section"]),
  selector: z.string(), // CSS selector using [data-id]
  editable: z.array(attributeEnum),
  label: z.string().optional(),
})

export const emailDraftSchema = z.object({
  html_inline: z.string(),
  assets: z.array(emailAssetSchema),
  manifest: z.object({
    blocks: z.array(emailBlockSchema),
  }),
})

export const editOpSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("setText"),
    id: z.string(),
    value: z.string(),
  }),
  z.object({
    kind: z.literal("setAttr"),
    id: z.string(),
    name: attributeEnum.exclude(["text"]),
    value: z.string(),
  }),
])

export type EmailMessage = z.infer<typeof emailMessageSchema>
export type EmailAsset = z.infer<typeof emailAssetSchema>
export type EmailBlock = z.infer<typeof emailBlockSchema>
export type EmailDraft = z.infer<typeof emailDraftSchema>
export type EditOp = z.infer<typeof editOpSchema>
export type AttributeName = z.infer<typeof attributeEnum>