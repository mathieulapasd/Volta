"use client";

import { Trash2 } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import DeleteEntityDialog from "./DeleteEntityDialog";
import EditableName from "./EditableName";

interface EntityTileProps {
  href: Route;
  disabled?: boolean;
  icon: ReactNode;
  name: string;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  deleteEntityLabel: string;
  deleteDescription: string;
  deleteAriaLabel: string;
}

export default function EntityTile({
  href,
  disabled = false,
  icon,
  name,
  onRename,
  onDelete,
  deleteEntityLabel,
  deleteDescription,
  deleteAriaLabel,
}: EntityTileProps): ReactElement {
  const router = useRouter();

  const handleNavigate = () => {
    if (disabled) {
      return;
    }

    router.push(href);
  };

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (target.closest("[data-tile-action]")) {
      return;
    }

    handleNavigate();
  };

  return (
    <Card
      className="group relative h-36 cursor-pointer gap-0 py-4 transition-colors hover:bg-muted/50"
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleNavigate();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <CardContent className="flex h-full flex-col justify-between px-4">
        <div className="flex items-start justify-between gap-2">
          {icon}
          <div data-tile-action>
            <DeleteEntityDialog
              entityLabel={deleteEntityLabel}
              cascadeDescription={deleteDescription}
              onConfirm={onDelete}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={deleteAriaLabel}
                  disabled={disabled}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              }
            />
          </div>
        </div>
        <div data-tile-action>
          <EditableName value={name} onSave={onRename} />
        </div>
      </CardContent>
    </Card>
  );
}
