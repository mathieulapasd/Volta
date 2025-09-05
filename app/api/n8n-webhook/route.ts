import { z } from "zod";

const JsonRequestBodySchema = z.object({
  message: z.string().min(1),
});

const N8N_WEBHOOK_URL = "https://n8n.srv982868.hstgr.cloud/webhook-test/4cec692c-9281-44e5-b4ca-7b8fa822b372" as const;

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    // Handle multipart/form-data (message + multiple files)
    if (contentType.includes("multipart/form-data")) {
      const incomingForm = await request.formData();

      const messageRaw = incomingForm.get("message");
      const message = typeof messageRaw === "string" ? messageRaw : "";

      const incomingFiles = incomingForm.getAll("files");
      const files = incomingFiles.filter((f): f is File => f instanceof File);

      if (!message && files.length === 0) {
        return Response.json({ error: "Invalid form-data: provide a message or at least one file" }, { status: 400 });
      }

      const forwardForm = new FormData();

      if (message) {
        forwardForm.append("message", message);
      }

      for (const file of files) {
        forwardForm.append("files", file, file.name);
      }

      const upstreamResponse = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        body: forwardForm,
        credentials: "omit",
        cache: "no-store",
      });

      const data = await upstreamResponse.json().catch(() => null);
      const status = upstreamResponse.status;

      if (data === null) {
        return Response.json({}, { status });
      }

      return Response.json(data, { status });
    }

    // Fallback: JSON body with message only
    const json = (await request.json()) as unknown;
    const parsed = JsonRequestBodySchema.safeParse(json);

    if (!parsed.success) {
      return Response.json({ error: "Invalid request body", details: z.treeifyError(parsed.error) }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("message", parsed.data.message);

    const upstreamResponse = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: formData,
      credentials: "omit",
      cache: "no-store",
    });

    const data = await upstreamResponse.json().catch(() => null);
    const status = upstreamResponse.status;

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
