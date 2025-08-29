"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NumberInputWithUnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export default function NumberInputWithUnitSelect(props: NumberInputWithUnitSelectProps) {
  const splitNumberAndUnit = (input: string) => {
    const match = /^(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw)?$/i.exec(input.trim());

    if (!match) {
      return { num: "", unit: "px" };
    }

    return { num: match[1], unit: (match[2] || "px").toLowerCase() };
  };

  const joinNumberAndUnit = (num: string, unit: string) => {
    if (!num) {
      return "";
    }

    return `${num}${unit}`;
  };

  const { num, unit } = splitNumberAndUnit(props.value);

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={num}
        onChange={(e) => props.onChange(joinNumberAndUnit(e.target.value, unit))}
        onBlur={props.onBlur}
        placeholder="16"
      />
      <Select value={unit} onValueChange={(u) => props.onChange(joinNumberAndUnit(num, u))}>
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="px">px</SelectItem>
          <SelectItem value="rem">rem</SelectItem>
          <SelectItem value="em">em</SelectItem>
          <SelectItem value="%">%</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
