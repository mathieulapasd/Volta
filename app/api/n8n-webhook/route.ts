import { z } from "zod";

const RequestBodySchema = z.object({
  message: z.string().min(1),
});

const N8N_WEBHOOK_URL = "https://n8n.srv982868.hstgr.cloud/webhook-test/4cec692c-9281-44e5-b4ca-7b8fa822b372" as const;

export async function POST(request: Request): Promise<Response> {
  try {
    const json = (await request.json()) as unknown;
    const parsed = RequestBodySchema.safeParse(json);

    if (!parsed.success) {
      return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
    }

    const upstreamResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
      // Prevent passing along cookies/credentials accidentally
      credentials: "omit",
      cache: "no-store",
    });

    // Forward status and JSON body
    const data = await upstreamResponse.json().catch(() => null);
    const status = upstreamResponse.status;

    // If n8n returns non-JSON or empty, still return JSON to avoid client parse errors
    if (data === null) {
      return Response.json({}, { status });
    }

    return Response.json(data, { status });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("n8n-webhook route error", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, GET, OPTIONS",
    },
  });
}
