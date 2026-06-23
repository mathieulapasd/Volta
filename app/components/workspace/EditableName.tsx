"use client";

import { type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface EditableNameProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  className?: string;
  inputClassName?: string;
}

export default function EditableName({ value, onSave, className, inputClassName }: EditableNameProps): ReactElement {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const save = () => {
    const trimmed = draft.trim();

    if (!trimmed || trimmed === value) {
      cancel();
      return;
    }

    setIsEditing(false);
    onSave(trimmed).catch(() => {
      // Errors are surfaced via the rename action's toast/rollback.
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();
      save();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          save();
        }}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
        className={cn("h-8 text-sm", inputClassName)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsEditing(true);
      }}
      className={cn("truncate text-left font-medium hover:underline", className)}
    >
      {value}
    </button>
  );
}
