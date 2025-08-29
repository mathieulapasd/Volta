"use client";

import { Input } from "@/components/ui/input";

interface ColorInputProps {
  value: string | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export default function ColorInput(props: ColorInputProps) {
  const normalizeColor = (value = "", fallback = "#000000") => {
    const v = value.trim();

    if (!v) {
      return fallback;
    }

    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      return v.toLowerCase();
    }

    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      const r = v[1];
      const g = v[2];
      const b = v[3];

      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }

    const rgb = v.match(/^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*(0|1|0?\.\d+))?\)$/i);

    if (rgb) {
      const r = Math.max(0, Math.min(255, Number.parseInt(rgb[1], 10)))
        .toString(16)
        .padStart(2, "0");
      const g = Math.max(0, Math.min(255, Number.parseInt(rgb[2], 10)))
        .toString(16)
        .padStart(2, "0");
      const b = Math.max(0, Math.min(255, Number.parseInt(rgb[3], 10)))
        .toString(16)
        .padStart(2, "0");

      return `#${r}${g}${b}`;
    }

    return fallback;
  };

  return (
    <Input
      type="color"
      value={normalizeColor(props.value)}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
    />
  );
}
