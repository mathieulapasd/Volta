import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function setCookie(name: string, value: unknown, days = 365): void {
  const maxAge = days * 24 * 60 * 60;
  const encoded = encodeURIComponent(JSON.stringify(value));
  const attrs = [
    "path=/",
    `max-age=${maxAge}`,
    "samesite=lax",
    typeof window !== "undefined" && window.location.protocol === "https:" ? "secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  document.cookie = `${name}=${encoded}; ${attrs}`;
}