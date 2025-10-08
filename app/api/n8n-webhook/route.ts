/**
 * Route TypeScript optimisée pour l'agent de marketing email
 * 
 * CORRECTIONS APPORTÉES:
 * - Synchronisation des types avec l'API Python
 * - Gestion d'erreurs robuste et cohérente
 * - Support CORS complet
 * - Validation stricte des réponses
 * - Logging amélioré pour le debugging
 * - Fallbacks et retry logic
 */

import { z } from "zod";

// Schema de validation pour les requêtes JSON
const JsonRequestBodySchema = z.object({
  message: z.string().min(1),
});

// Schema de validation pour la réponse de l'agent Python (synchronisé avec models.py)
const EmailGenerationResultSchema = z.object({
  html_inline: z.string(),
  manifest: z.object({
    blocks: z.array(z.object({
      id: z.string(),
      type: z.enum(["text", "image", "button", "section"]),
      selector: z.string(),
      editable: z.array(z.string()),
      label: z.string().optional(),
    })),
  }),
  config: z.object({
    width: z.string(),
    font_family: z.string(),
    primary_color: z.string(),
    text_color: z.string(),
    background_color: z.string(),
  }),
  assets: z.array(z.object({
    id: z.string(),
    url: z.string(),
    type: z.string(),
    alt: z.string().optional(),
  })),
});

// Configuration de l'agent Python
const AGENT_BASE_URL = process.env.EMAIL_AGENT_URL || "http://localhost:8000";
const REQUEST_TIMEOUT = parseInt(process.env.EMAIL_AGENT_TIMEOUT || "300000");
const MAX_RETRIES = parseInt(process.env.EMAIL_AGENT_MAX_RETRIES || "2");

// Types TypeScript synchronisés avec Python
type EmailGenerationResult = z.infer<typeof EmailGenerationResultSchema>;

interface AgentErrorResponse {
  detail?: string;
  error?: string;
}

/**
 * Appelle l'agent Python avec retry logic et validation stricte
 */
async function callEmailAgent(
  message: string, 
  files?: File[], 
  retryCount = 0
): Promise<{ success: true; data: EmailGenerationResult } | { success: false; error: string; status: number }> {
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    // Log de la tentative
    console.log(`[EmailAgent] Attempt ${retryCount + 1}/${MAX_RETRIES + 1} - Calling ${AGENT_BASE_URL}/generate-email`);
    
    // Préparer la requête
    const requestBody = {
      message: message,
      tone: "journalistic",
      context: files && files.length > 0 ? { 
        files_info: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
      } : undefined,
    };

    const response = await fetch(`${AGENT_BASE_URL}/generate-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Gestion des erreurs HTTP
    if (!response.ok) {
      let errorMessage = `Agent error ${response.status}`;
      
      try {
        const errorData: AgentErrorResponse = await response.json();
        errorMessage = errorData.detail || errorData.error || errorMessage;
      } catch {
        // Si on ne peut pas parser l'erreur, utiliser le message par défaut
      }

      // Retry pour les erreurs 5xx (sauf 504 timeout)
      if (response.status >= 500 && response.status !== 504 && retryCount < MAX_RETRIES) {
        console.warn(`[EmailAgent] Server error ${response.status}, retrying in 1s...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return callEmailAgent(message, files, retryCount + 1);
      }

      return { 
        success: false, 
        error: errorMessage, 
        status: response.status 
      };
    }

    // Parser et valider la réponse
    const rawData = await response.json();
    
    // Validation stricte avec Zod
    const validationResult = EmailGenerationResultSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error("[EmailAgent] Invalid response format:", validationResult.error);
      return { 
        success: false, 
        error: "Invalid response format from agent", 
        status: 502 
      };
    }

    console.log("[EmailAgent] Success - Email generated");
    return { 
      success: true, 
      data: validationResult.data 
    };

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(`[EmailAgent] Timeout after ${REQUEST_TIMEOUT}ms`);
        return { 
          success: false, 
          error: `Timeout: L'agent n'a pas répondu dans les ${REQUEST_TIMEOUT}ms`, 
          status: 504 
        };
      }
      
      // Retry pour les erreurs réseau
      if (retryCount < MAX_RETRIES && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED')
      )) {
        console.warn(`[EmailAgent] Network error, retrying in 1s...`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return callEmailAgent(message, files, retryCount + 1);
      }
      
      console.error("[EmailAgent] Error:", error.message);
      return { 
        success: false, 
        error: `Erreur de connexion: ${error.message}`, 
        status: 502 
      };
    }
    
    return { 
      success: false, 
      error: "Erreur inconnue lors de l'appel à l'agent", 
      status: 500 
    };
  }
}

/**
 * Headers CORS appropriés
 */
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Convertit la réponse de l'agent Python au format attendu par builder-crm
 */
function convertAgentResponseToBuilderFormat(agentData: EmailGenerationResult) {
  // Mapper font_family vers le format enum attendu
  const fontMapping: Record<string, string> = {
    "Arial": "arial",
    "Helvetica": "helvetica", 
    "Times New Roman": "times-new-roman",
    "Courier New": "courier-new",
    "Verdana": "verdana"
  };

  const font = fontMapping[agentData.config.font_family] || "arial";

  // Mapper les propriétés editable de l'agent vers les attributs builder-crm
  const editableMapping: Record<string, string> = {
    "logo_url": "src",
    "logo_alt": "alt",
    "image_url": "src", 
    "image_alt": "alt",
    "background_color": "bgcolor",
    "text_color": "color",
    "subtitle": "text",
    "title": "text",
    "alignment": "textAlign",
    "company_name": "text",
    "address": "text", 
    "unsubscribe_url": "href",
    "social_links": "href",
    "url": "href"
  };

  // Convertir les blocs avec mapping des propriétés editable
  const convertedBlocks = agentData.manifest.blocks.map(block => ({
    ...block,
    editable: block.editable.map(prop => editableMapping[prop] || prop).filter(prop => 
      // Garder seulement les propriétés valides selon le schéma builder-crm
      ["text", "src", "href", "alt", "bgcolor", "color", "width", "height", "target", 
       "fontSize", "fontWeight", "textAlign", "lineHeight", "padding", "borderRadius"].includes(prop)
    )
  }));

  // Convertir au format builder-crm
  const builderFormat = {
    css_inline: "", // builder-crm génère son propre CSS
    html_inline: agentData.html_inline,
    manifest: {
      blocks: convertedBlocks
    },
    config: {
      font: font,
      primaryColor: agentData.config.primary_color
    },
    assets: agentData.assets || []
  };

  return builderFormat;
}

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
        return Response.json(
          { error: "Invalid form-data: provide a message or at least one file" }, 
          { 
            status: 400,
            headers: getCorsHeaders()
          }
        );
      }

      // Appeler l'agent
      const result = await callEmailAgent(message, files);

      if (result.success) {
        // Convertir au format builder-crm et encapsuler dans output
        const builderData = convertAgentResponseToBuilderFormat(result.data);
        return Response.json({ 
          output: JSON.stringify(builderData)
        }, { 
          status: 200,
          headers: getCorsHeaders()
        });
      } else {
        return Response.json(
          { error: result.error }, 
          { 
            status: result.status,
            headers: getCorsHeaders()
          }
        );
      }
    }

    // Fallback: JSON body with message only
    const json = (await request.json()) as unknown;
    const parsed = JsonRequestBodySchema.safeParse(json);

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request body", details: z.treeifyError(parsed.error) }, 
        { 
          status: 400,
          headers: getCorsHeaders()
        }
      );
    }

    // Appeler l'agent
    const result = await callEmailAgent(parsed.data.message);

    if (result.success) {
      // Convertir au format builder-crm et encapsuler dans output
      const builderData = convertAgentResponseToBuilderFormat(result.data);
      return Response.json({ 
        output: JSON.stringify(builderData)
      }, { 
        status: 200,
        headers: getCorsHeaders()
      });
    } else {
      return Response.json(
        { error: result.error }, 
        { 
          status: result.status,
          headers: getCorsHeaders()
        }
      );
    }

  } catch (error) {
    console.error("[Route] Unexpected error:", error);
    return Response.json(
      { error: "Internal Server Error" }, 
      { 
        status: 500,
        headers: getCorsHeaders()
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