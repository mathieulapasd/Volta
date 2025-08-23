import type { EmailDraft } from "./schemas"

interface AIResponse {
  content: string
  tokenCount: number
  draft?: EmailDraft
}

// Mock AI response - replace with real AI SDK integration
export async function sendMessage(
  message: string,
  temperature: number,
  assets: EmailDraft["assets"],
): Promise<AIResponse> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000))

  // Mock token counting
  const tokenCount = Math.floor(message.length / 4) + Math.floor(Math.random() * 100)

  // Check if this looks like an email generation request
  const isEmailRequest =
    message.toLowerCase().includes("email") ||
    message.toLowerCase().includes("newsletter") ||
    message.toLowerCase().includes("template")

  if (isEmailRequest) {
    // Generate a sample email draft
    const sampleDraft: EmailDraft = {
      html_inline: `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
          <tr>
            <td style="padding: 0;">
              <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
                <!-- Preheader -->
                <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                  Votre newsletter de la semaine est là!
                </div>
                
                <!-- Header -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 40px 20px; text-align: center; background-color: #f8f9fa;">
                      <h1 data-id="header-title" style="margin: 0; font-size: 28px; font-weight: bold; color: #1a1a1a;">
                        Newsletter semaine
                      </h1>
                      <p data-id="header-subtitle" style="margin: 10px 0 0 0; font-size: 16px; color: #666666;">
                        Restez informés de nos dernières actualités et conseils
                      </p>
                    </td>
                  </tr>
                </table>
                
                <!-- Hero Image -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 0;">
                      <img data-id="hero-image" src="/newsletter-hero.png" 
                           alt="Newsletter hero" width="600" height="300" 
                           style="width: 100%; height: auto; display: block;" />
                    </td>
                  </tr>
                </table>
                
                <!-- Content -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 40px 20px; background-color: #ffffff;">
                      <h2 data-id="content-title" style="margin: 0 0 20px 0; font-size: 24px; font-weight: bold; color: #1a1a1a;">
                        Les points forts de la semaine
                      </h2>
                      <p data-id="content-text" style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #333333;">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                      </p>
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="border-radius: 6px; background-color: #007bff;">
                            <a data-id="cta-button" href="#" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">
                              Lire plus
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <!-- Footer -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td style="padding: 20px; text-align: center; background-color: #f8f9fa;">
                      <p data-id="footer-text" style="margin: 0; font-size: 14px; color: #666666;">
                        © 2025 Builder CRM. Tous droits réservés.
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      `,
      assets: assets,
      manifest: {
        blocks: [
          {
            id: "header-title",
            type: "text",
            selector: '[data-id="header-title"]',
            editable: ["text", "color", "fontSize", "fontWeight", "textAlign", "lineHeight", "padding"],
            label: "Titre du header",
          },
          {
            id: "header-subtitle",
            type: "text",
            selector: '[data-id="header-subtitle"]',
            editable: ["text", "color", "fontSize", "fontWeight", "textAlign", "lineHeight", "padding"],
            label: "Sous-titre du header",
          },
          {
            id: "hero-image",
            type: "image",
            selector: '[data-id="hero-image"]',
            editable: ["src", "alt", "width", "height", "borderRadius"],
            label: "Image principale",
          },
          {
            id: "content-title",
            type: "text",
            selector: '[data-id="content-title"]',
            editable: ["text", "color", "fontSize", "fontWeight", "textAlign", "lineHeight", "padding"],
            label: "Titre du contenu",
          },
          {
            id: "content-text",
            type: "text",
            selector: '[data-id="content-text"]',
            editable: ["text", "color", "fontSize", "fontWeight", "textAlign", "lineHeight", "padding"],
            label: "Texte du contenu",
          },
          {
            id: "cta-button",
            type: "button",
            selector: '[data-id="cta-button"]',
            editable: [
              "text",
              "href",
              "target",
              "bgcolor",
              "color",
              "fontWeight",
              "textAlign",
              "fontSize",
              "padding",
              "borderRadius",
            ],
            label: "Bouton d'appel à l'action",
          },
          {
            id: "footer-text",
            type: "text",
            selector: '[data-id="footer-text"]',
            editable: ["text", "color", "fontSize", "fontWeight", "textAlign", "lineHeight", "padding"],
            label: "Texte du pied de page",
          },
        ],
      },
    }

    return {
      content: `J'ai créé un template de newsletter professionnel pour vous! L'e-mail inclut:

- Un header propre avec un titre et un sous-titre
- Une section d'image principale
- Une zone de contenu principale avec des points forts
- Un bouton d'appel à l'action
- Un pied de page avec le copyright

Vous pouvez survoler n'importe quel élément dans la prévisualisation pour l'éditer. Le template utilise un layout basé sur les tables pour la compatibilité maximale avec les clients e-mail et inclut des fonctionnalités d'accessibilité appropriées.`,
      tokenCount,
      draft: sampleDraft,
    }
  }

  // Regular chat response
  const responses = [
    "Je suis heureux de vous aider à créer un template d'e-mail! Pouvez-vous décrire le type d'e-mail que vous souhaitez créer?",
    "Quel type d'e-mail recherchez-vous? Une newsletter, un e-mail promotionnel, un message de bienvenue, ou autre chose?",
    "Je peux vous aider à créer différents types d'e-mails. Quel est le but et la cible de votre e-mail?",
    "Fournissez-moi plus de détails sur vos besoins d'e-mail et je générerai un template personnalisé pour vous.",
  ]

  return {
    content: responses[Math.floor(Math.random() * responses.length)],
    tokenCount,
  }
}
