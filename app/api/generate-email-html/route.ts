import { z } from "zod";
import { emailDraftSchema } from "@/lib/schemas";
import { createClient } from "@/utils/supabase/server";

const RequestSchema = z.object({
  message: z.string().min(1),
  chat_id: z.uuid(),
});

const AgentResponseSchema = z.object({
  html_inline: z.string(),
  css_inline: z.string().default(""),
  manifest: z.object({
    blocks: z.array(
      z.object({
        id: z.string(),
        type: z.enum(["text", "image", "button", "section"]),
        selector: z.string(),
        editable: z.array(z.string()),
        label: z.string().optional(),
      })
    ),
  }),
  config: z.object({
    font: z.string().default("arial"),
    primaryColor: z.string().default("#007bff"),
  }),
  agent_response: z.string(),
});

const AGENT_BASE_URL =
  process.env.EMAIL_AGENT_URL ||
  "https://agent-volta-staging-427210296529.europe-west1.run.app";

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: getCorsHeaders() });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: getCorsHeaders() });
    }

    const contentType = request.headers.get("content-type") ?? "";
    let chatId: string;
    let message: string;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const parsed = RequestSchema.safeParse({
        message: form.get("message") ?? "",
        chat_id: form.get("chat_id"),
      });
      if (!parsed.success) {
        return Response.json({ error: "Invalid request" }, { status: 400, headers: getCorsHeaders() });
      }
      chatId = parsed.data.chat_id;
      message = parsed.data.message;
      files = form.getAll("files").filter((f): f is File => f instanceof File);
    } else {
      const body = await request.json();
      const parsed = RequestSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json({ error: "Invalid request" }, { status: 400, headers: getCorsHeaders() });
      }
      chatId = parsed.data.chat_id;
      message = parsed.data.message;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000);

    let agentResponse: Response;

    if (files.length > 0) {
      const form = new FormData();
      form.append("auth_id", user.id);
      form.append("chat_id", chatId);
      form.append("message", message);
      for (const f of files) form.append("files", f);
      agentResponse = await fetch(`${AGENT_BASE_URL}/generate-email-html`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
    } else {
      agentResponse = await fetch(`${AGENT_BASE_URL}/generate-email-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ auth_id: user.id, chat_id: chatId, message }),
        signal: controller.signal,
      });
    }

    clearTimeout(timeout);

    if (!agentResponse.ok) {
      const err = await agentResponse.json().catch(() => ({}));
      return Response.json(
        { error: (err as { detail?: string }).detail ?? `Agent error ${agentResponse.status}` },
        { status: agentResponse.status, headers: getCorsHeaders() }
      );
    }

    const raw = await agentResponse.json();
    const validated = AgentResponseSchema.safeParse(raw);

    if (!validated.success) {
      console.error("[generate-email-html] Invalid agent response:", validated.error);
      return Response.json(
        { error: "Invalid response from agent" },
        { status: 502, headers: getCorsHeaders() }
      );
    }

    const { html_inline, css_inline, manifest, config, agent_response } = validated.data;

    // Persist message to Supabase
    await supabase.from("messages").insert({
      auth_id: user.id,
      chat_id: chatId,
      role: "assistant",
      message: agent_response,
      html_inline,
    });

    const draft = emailDraftSchema.parse({
      html_inline,
      css_inline,
      manifest,
      config: { font: config.font as "arial", primaryColor: config.primaryColor },
    });

    return Response.json(
      { output: JSON.stringify({ draft, agent_response }) },
      { headers: getCorsHeaders() }
    );
  } catch (err) {
    console.error("[generate-email-html] Error:", err);
    return Response.json(
      { error: "Internal Server Error" },
      { status: 500, headers: getCorsHeaders() }
    );
  }
}
