"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DarkMode = "light" | "dark";

interface Device {
  id: string;
  label: string;
  width: string;
}

const DEVICES: { group: string; items: Device[] }[] = [
  {
    group: "Desktop",
    items: [
      { id: "desktop-1440", label: "Desktop 1440p", width: "1440px" },
      { id: "desktop-1280", label: "Desktop 1280px", width: "1280px" },
      { id: "desktop-1024", label: "Desktop 1024px", width: "1024px" },
    ],
  },
  {
    group: "Tablette",
    items: [
      { id: "ipad-pro", label: 'iPad Pro 12.9"', width: "1024px" },
      { id: "ipad", label: "iPad / iPad Air", width: "820px" },
      { id: "ipad-mini", label: "iPad Mini", width: "768px" },
    ],
  },
  {
    group: "Mobile",
    items: [
      { id: "iphone-15-pro", label: "iPhone 15 Pro", width: "393px" },
      { id: "iphone-13", label: "iPhone 13 / 14", width: "390px" },
      { id: "iphone-se", label: "iPhone SE", width: "375px" },
      { id: "samsung-s23", label: "Samsung Galaxy S23", width: "360px" },
      { id: "pixel-7", label: "Google Pixel 7", width: "412px" },
    ],
  },
];

const ALL_DEVICES = DEVICES.flatMap((g) => g.items);

type EmailClient = "default" | "gmail" | "outlook" | "apple-mail";

const EMAIL_CLIENTS: { id: EmailClient; label: string }[] = [
  { id: "default", label: "Navigateur (natif)" },
  { id: "gmail", label: "Gmail" },
  { id: "outlook", label: "Outlook" },
  { id: "apple-mail", label: "Apple Mail" },
];

// Gmail strips <head> styles — only inline CSS survives
const GMAIL_LIGHT_CSS = `
  <style id="volta-client">
    /* Gmail strips non-inline styles — simulate by neutralizing head styles */
    body { font-family: Arial, sans-serif !important; }
  </style>
`;

// Gmail dark mode — invert wrapper, restore images
const GMAIL_DARK_CSS = `
  <style id="volta-client">
    html, body { background: #1f1f1f !important; }
    #volta-wrapper { filter: invert(1) hue-rotate(180deg); }
    #volta-wrapper img { filter: invert(1) hue-rotate(180deg); }
  </style>
`;

// Outlook (Word rendering engine — 2007–2019)
// Sources: https://www.emailonacid.com/blog/article/email-development/outlook-everything-you-need-to-know-about-outlook/
const OUTLOOK_CSS = `
  <style id="volta-client">
    /* Strip @font-face — Outlook ignores web fonts, falls back to Calibri */
    @font-face { font-family: none; }

    /* Outlook ignores <style> blocks in <head> for 2007-2019,
       but we inject after so we can simulate the cascade loss */

    /* Default Outlook font when no inline style is set */
    body { font-family: Calibri, Arial, sans-serif !important; }

    /* Outlook adds Word-style paragraph spacing (space-after) */
    p { margin: 0 0 12pt 0 !important; }

    /* No border-radius — Outlook renders square corners */
    * { border-radius: 0 !important; }

    /* No box-shadow */
    * { box-shadow: none !important; }

    /* No CSS animations or transitions */
    * { animation: none !important; transition: none !important; }

    /* Outlook ignores background-image on divs and tds */
    div, td, th, section, header, footer {
      background-image: none !important;
    }

    /* Flexbox and grid are not supported — items stack vertically */
    [style*="display: flex"], [style*="display:flex"] { display: block !important; }
    [style*="display: grid"], [style*="display:grid"] { display: block !important; }

    /* position absolute/fixed ignored */
    [style*="position: absolute"], [style*="position:absolute"],
    [style*="position: fixed"], [style*="position:fixed"] {
      position: static !important;
    }

    /* max-width / min-width on divs ignored */
    div[style*="max-width"] { max-width: none !important; }
    div[style*="min-width"] { min-width: 0 !important; }

    /* Outline a warning strip to highlight broken areas */
    div[style*="display: flex"], div[style*="display:flex"],
    div[style*="display: grid"], div[style*="display:grid"] {
      outline: 2px dashed rgba(255,80,0,0.4) !important;
    }
  </style>
`;

// Apple Mail — excellent support, just normalize
const APPLE_MAIL_CSS = `
  <style id="volta-client">
    body { font-family: -apple-system, "Helvetica Neue", sans-serif !important; }
    a { color: #147EFB !important; }
  </style>
`;

function buildIframeContent(html: string, client: EmailClient, darkMode: DarkMode): string {
  const isGmailDark = client === "gmail" && darkMode === "dark";
  const isGmailLight = client === "gmail" && darkMode === "light";

  let injectedStyle = "";
  if (isGmailDark) injectedStyle = GMAIL_DARK_CSS;
  else if (isGmailLight) injectedStyle = GMAIL_LIGHT_CSS;
  else if (client === "outlook") injectedStyle = OUTLOOK_CSS;
  else if (client === "apple-mail") injectedStyle = APPLE_MAIL_CSS;

  // For Gmail dark / default dark: wrap body content in a div with filter
  const needsWrapper = isGmailDark || (client === "default" && darkMode === "dark");

  let result = html;

  if (needsWrapper) {
    const wrapperStyle = `
      <style id="volta-dark">
        html, body { background: #1f1f1f !important; }
        #volta-wrapper { filter: invert(1) hue-rotate(180deg); }
        #volta-wrapper img { filter: invert(1) hue-rotate(180deg); }
      </style>
    `;
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      const bodyContent = bodyMatch[1];
      result = html
        .replace(/<head>/i, `<head>${wrapperStyle}`)
        .replace(/<body[^>]*>[\s\S]*<\/body>/i, `<body><div id="volta-wrapper">${bodyContent}</div></body>`);
    }
  }

  if (injectedStyle) {
    if (result.includes("</head>")) {
      result = result.replace("</head>", `${injectedStyle}</head>`);
    } else {
      result = injectedStyle + result;
    }
  }

  return result;
}

export default function PreviewPage() {
  const [mounted, setMounted] = useState(false);
  const [html, setHtml] = useState("");
  const [deviceId, setDeviceId] = useState("desktop-1440");
  const [client, setClient] = useState<EmailClient>("default");
  const [darkMode, setDarkMode] = useState<DarkMode>("light");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("volta-preview-html");
    if (saved) setHtml(saved);
    setMounted(true);
  }, []);

  const device = ALL_DEVICES.find((d) => d.id === deviceId) ?? ALL_DEVICES[0];

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    const content = buildIframeContent(html, client, darkMode);
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    iframe.src = url;

    return () => URL.revokeObjectURL(url);
  }, [html, client, darkMode]);

  if (!mounted) {
    return null;
  }

  const clientLabel = EMAIL_CLIENTS.find((c) => c.id === client)?.label ?? "";

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex h-15 shrink-0 items-center gap-3 border-border border-b bg-primary px-4">
        {/* Device dropdown */}
        <Select value={deviceId} onValueChange={setDeviceId}>
          <SelectTrigger className="w-52 rounded-full border border-[#FCF5CA]/30 bg-transparent text-[#FCF5CA]/70 transition-all hover:border-[#FCF5CA] hover:text-[#FCF5CA] focus:ring-0 [&>svg]:text-[#FCF5CA]/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DEVICES.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>

        {/* Client dropdown */}
        <Select value={client} onValueChange={(v) => setClient(v as EmailClient)}>
          <SelectTrigger className="w-48 rounded-full border border-[#FCF5CA]/30 bg-transparent text-[#FCF5CA]/70 transition-all hover:border-[#FCF5CA] hover:text-[#FCF5CA] focus:ring-0 [&>svg]:text-[#FCF5CA]/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EMAIL_CLIENTS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="h-5 w-px bg-[#FCF5CA]/20" />

        {/* Dark mode toggle — disabled for Outlook (always light) */}
        <Button
          size="sm"
          disabled={client === "outlook"}
          onClick={() => setDarkMode(darkMode === "light" ? "dark" : "light")}
          className={
            darkMode === "dark"
              ? "rounded-full bg-[#FCF5CA] px-4 font-medium text-[#1a1a2e] shadow-sm transition-all hover:bg-[#FCF5CA]/85 disabled:opacity-30"
              : "rounded-full border border-[#FCF5CA]/30 bg-transparent px-4 text-[#FCF5CA]/70 transition-all hover:border-[#FCF5CA] hover:bg-[#FCF5CA]/10 hover:text-[#FCF5CA] disabled:opacity-30"
          }
        >
          {darkMode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="ml-1.5">{darkMode === "dark" ? "Dark mode" : "Light mode"}</span>
        </Button>
      </div>

      {/* Preview area */}
      <div
        className="flex flex-1 items-start justify-center overflow-auto py-8"
        style={{ backgroundColor: darkMode === "dark" ? "#111827" : "#e5e7eb" }}
      >
        {!html ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Aucun email à prévisualiser. Retourne dans le builder et génère un email d'abord.
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-lg shadow-2xl transition-all duration-300"
            style={{ width: device.width, maxWidth: "100%" }}
          >
            <iframe
              ref={iframeRef}
              title="Email preview"
              className="block w-full border-0"
              style={{ minHeight: "80vh" }}
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex h-8 shrink-0 items-center justify-center border-border border-t bg-muted px-4">
        <span className="text-muted-foreground text-xs">
          {device.label} — {device.width} · {clientLabel}
          {darkMode === "dark" ? " · Dark mode" : ""}
        </span>
      </div>
    </div>
  );
}
