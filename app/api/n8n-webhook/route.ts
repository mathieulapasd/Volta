/**
 * Route TypeScript optimisée pour l'agent de marketing email
 */

import { z } from "zod";
import { unlayerDesignSchema } from "@/lib/schemas";
import { createClient } from "@/utils/supabase/server";

const chatIdSchema = z.uuid();

const JsonRequestBodySchema = z.object({
  message: z.string().min(1),
  chat_id: chatIdSchema,
});

const emailGenerationResultSchema = z.object({
  unlayer_design: unlayerDesignSchema,
  config: z.object({
    width: z.string(),
    font_family: z.string(),
    primary_color: z.string(),
    text_color: z.string(),
    background_color: z.string(),
    font: z.string(),
    primaryColor: z.string(),
  }),
  agent_response: z.string(),
});

const AGENT_BASE_URL = process.env.EMAIL_AGENT_URL || "https://agent-volta-staging-427210296529.europe-west1.run.app";
const REQUEST_TIMEOUT = Number.parseInt(process.env.EMAIL_AGENT_TIMEOUT || "300000", 10);
const MAX_RETRIES = Number.parseInt(process.env.EMAIL_AGENT_MAX_RETRIES || "2", 10);

const FETCH_URL = `${AGENT_BASE_URL}/generate-email-unlayer`;

type EmailGenerationResult = z.infer<typeof emailGenerationResultSchema>;

interface AgentErrorResponse {
  detail?: string;
  error?: string;
}

async function callEmailAgent(
  chatId: string,
  message: string,
  files?: File[],
  retryCount = 0
): Promise<{ success: true; data: EmailGenerationResult } | { success: false; error: string; status: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "User not found",
      status: 401,
    };
  }

  try {
    const requestBody = {
      auth_id: user.id,
      chat_id: chatId,
      message,
      tone: "journalistic",
      context:
        files && files.length > 0
          ? {
              files_info: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
            }
          : undefined,
    };

    const response = await fetch(FETCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `Agent error ${response.status}`;

      try {
        const errorData: AgentErrorResponse = await response.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {
        // use default error message
      }

      if (response.status >= 500 && response.status !== 504 && retryCount < MAX_RETRIES) {
        console.warn(`[EmailAgent] Server error ${response.status}, retrying in 1s...`, errorMessage);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return callEmailAgent(chatId, message, files, retryCount + 1);
      }

      return {
        success: false,
        error: errorMessage,
        status: response.status,
      };
    }

    const rawData = await response.json();
    const validationResult = emailGenerationResultSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error("[EmailAgent] Invalid response format:", validationResult.error);
      console.error("[EmailAgent] Received data:", JSON.stringify(rawData, null, 2));

      return {
        success: false,
        error: "Invalid response format from agent",
        status: 502,
      };
    }

    const { error: messageError } = await supabase.from("messages").insert({
      auth_id: user.id,
      chat_id: chatId,
      role: "assistant",
      message: validationResult.data.agent_response,
      unlayer_design: validationResult.data.unlayer_design,
    });

    if (messageError) {
      console.error("[EmailAgent] Failed to persist assistant message", messageError);
    }

    const { error: chatError } = await supabase
      .from("chats")
      .update({ unlayer_design: validationResult.data.unlayer_design })
      .eq("id", chatId)
      .eq("auth_id", user.id);

    if (chatError) {
      console.error("[EmailAgent] Failed to update chat design", chatError);
    }

    return {
      success: true,
      data: validationResult.data,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`[EmailAgent] Timeout after ${REQUEST_TIMEOUT}ms`);
        return {
          success: false,
          error: `Timeout: L'agent n'a pas répondu dans les ${REQUEST_TIMEOUT}ms`,
          status: 504,
        };
      }

      if (
        retryCount < MAX_RETRIES &&
        (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("ECONNREFUSED"))
      ) {
        console.warn("[EmailAgent] Network error, retrying in 1s...", error.message);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return callEmailAgent(chatId, message, files, retryCount + 1);
      }

      console.error("[EmailAgent] Error:", error.message);
      return {
        success: false,
        error: `Erreur de connexion: ${error.message}`,
        status: 502,
      };
    }

    return {
      success: false,
      error: "Erreur inconnue lors de l'appel à l'agent",
      status: 500,
    };
  }
}

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

function convertAgentResponseToBuilderFormat(agentData: EmailGenerationResult) {
  const fontMapping: Record<string, string> = {
    Arial: "arial",
    Helvetica: "helvetica",
    "Times New Roman": "times-new-roman",
    "Courier New": "courier-new",
    Verdana: "verdana",
  };

  const font = fontMapping[agentData.config.font_family] || "arial";

  return {
    unlayer_design: agentData.unlayer_design,
    config: {
      font: font,
      primaryColor: agentData.config.primary_color || agentData.config.primaryColor,
      width: agentData.config.width,
      fontFamily: agentData.config.font_family,
      textColor: agentData.config.text_color,
      backgroundColor: agentData.config.background_color,
    },
    agent_response: agentData.agent_response,
  };
}

function parseChatId(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const parsed = chatIdSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const incomingForm = await request.formData();

      const chatId = parseChatId(incomingForm.get("chat_id"));

      if (!chatId) {
        return Response.json(
          { error: "Invalid form-data: chat_id is required" },
          {
            status: 400,
            headers: getCorsHeaders(),
          }
        );
      }

      const messageRaw = incomingForm.get("message");
      const message = typeof messageRaw === "string" ? messageRaw : "";

      const incomingFiles = incomingForm.getAll("files");
      const files = incomingFiles.filter((f): f is File => f instanceof File);

      if (!message && files.length === 0) {
        return Response.json(
          { error: "Invalid form-data: provide a message or at least one file" },
          {
            status: 400,
            headers: getCorsHeaders(),
          }
        );
      }

      const result = await callEmailAgent(chatId, message, files);

      if (result.success) {
        const builderData = convertAgentResponseToBuilderFormat(result.data);

        return Response.json(
          {
            output: JSON.stringify(builderData),
          },
          {
            status: 200,
            headers: getCorsHeaders(),
          }
        );
      }

      return Response.json(
        { error: result.error },
        {
          status: result.status,
          headers: getCorsHeaders(),
        }
      );
    }

    const json = (await request.json()) as unknown;
    const parsed = JsonRequestBodySchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: z.treeifyError(parsed.error) },
        {
          status: 400,
          headers: getCorsHeaders(),
        }
      );
    }

    const result = await callEmailAgent(parsed.data.chat_id, parsed.data.message);

    if (result.success) {
      const builderData = convertAgentResponseToBuilderFormat(result.data);

      return Response.json(
        {
          output: JSON.stringify(builderData),
        },
        {
          status: 200,
          headers: getCorsHeaders(),
        }
      );
    }

    return Response.json(
      { error: result.error },
      {
        status: result.status,
        headers: getCorsHeaders(),
      }
    );
  } catch (error) {
    console.error("[Route] Unexpected error:", error);
    return Response.json(
      { error: "Internal Server Error" },
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
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
