"use client";

import { Plus } from "lucide-react";
import type { ReactElement } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CreateTileProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export default function CreateTile({ label, onClick, disabled, className }: CreateTileProps): ReactElement {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="text-left">
      <Card
        className={cn(
          "flex h-36 cursor-pointer items-center justify-center border-dashed py-0 transition-colors hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-50",
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Plus className="size-8" />
          <span className="text-sm">{label}</span>
        </div>
      </Card>
    </button>
  );
}
