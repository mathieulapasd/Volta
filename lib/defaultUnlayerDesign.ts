import type { UnlayerDesign } from "@/lib/schemas";

const LOGO_PATH = "/Logo_Volta_Jaune.png";

let cachedLogoDataUrl: string | null = null;

async function getLogoDataUrl(): Promise<string> {
  if (cachedLogoDataUrl) {
    return cachedLogoDataUrl;
  }

  const response = await fetch(LOGO_PATH);

  if (!response.ok) {
    throw new Error(`Failed to load logo from ${LOGO_PATH}`);
  }

  const blob = await response.blob();

  cachedLogoDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to encode logo as data URL"));
      }
    };

    reader.onerror = () => reject(new Error("Failed to read logo file"));
    reader.readAsDataURL(blob);
  });

  return cachedLogoDataUrl;
}

export function buildDefaultUnlayerDesign(logoUrl: string): UnlayerDesign {
  return {
    counters: {
      u_column: 1,
      u_row: 1,
      u_content_image: 1,
    },
    body: {
      id: "u_body_default",
      rows: [
        {
          id: "u_row_logo",
          cells: [1],
          columns: [
            {
              id: "u_column_logo",
              contents: [
                {
                  id: "u_content_image_logo",
                  type: "image",
                  values: {
                    containerPadding: "48px 24px",
                    src: {
                      url: logoUrl,
                      width: 160,
                    },
                    textAlign: "center",
                    altText: "Volta",
                    display: "inline",
                  },
                },
              ],
              values: {},
            },
          ],
          values: {},
        },
      ],
      headers: [],
      footers: [],
      values: {
        backgroundColor: "#ffffff",
        contentWidth: "600px",
        fontFamily: {
          label: "Arial",
          value: "arial",
        },
        textColor: "#000000",
      },
    },
    schemaVersion: 12,
  };
}

export async function getDefaultUnlayerDesign(): Promise<UnlayerDesign> {
  const logoUrl = await getLogoDataUrl();

  return buildDefaultUnlayerDesign(logoUrl);
}
