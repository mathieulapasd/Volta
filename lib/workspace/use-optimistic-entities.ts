"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface NamedEntity {
  id: string;
  name: string;
}

type SafeAction = (...args: never[]) => unknown;

interface EntityListMessages {
  created: string;
  renamed: string;
  deleted: string;
}

function getErrorMessage(error: { serverError?: unknown }): string {
  if (typeof error.serverError === "string") {
    return error.serverError;
  }

  return "Une erreur est survenue";
}

function hasError(result: unknown): boolean {
  if (!result || typeof result !== "object") {
    return false;
  }

  return "serverError" in result || "validationErrors" in result;
}

export function useOptimisticEntityList<T extends NamedEntity>(
  initialItems: T[],
  config: {
    createAction: SafeAction;
    renameAction: SafeAction;
    deleteAction: SafeAction;
    buildCreateInput: () => Record<string, unknown>;
    buildRenameInput: (id: string, name: string) => Record<string, unknown>;
    buildDeleteInput: (id: string) => Record<string, unknown>;
    createTemp: () => T;
    messages: EntityListMessages;
  }
) {
  const [items, setItems] = useState(initialItems);
  const [isCreating, setIsCreating] = useState(false);
  const pendingTempId = useRef<string | null>(null);

  useEffect(() => {
    setItems((prev) => {
      const tempItems = prev.filter((item) => item.id.startsWith("temp-"));

      if (tempItems.length === 0) {
        return initialItems;
      }

      return [...tempItems, ...initialItems];
    });
  }, [initialItems]);

  const { executeAsync: createAsync } = useAction(config.createAction as Parameters<typeof useAction>[0]);
  const { executeAsync: renameAsync } = useAction(config.renameAction as Parameters<typeof useAction>[0]);
  const { executeAsync: deleteAsync } = useAction(config.deleteAction as Parameters<typeof useAction>[0]);

  const createEntity = async () => {
    const temp = config.createTemp();
    pendingTempId.current = temp.id;

    setItems((prev) => [temp, ...prev]);
    setIsCreating(true);
    toast.success(config.messages.created);

    try {
      const result = await createAsync(config.buildCreateInput());

      if (hasError(result)) {
        setItems((prev) => prev.filter((item) => item.id !== temp.id));
        toast.error(getErrorMessage(result as { serverError?: unknown }));
        return;
      }

      const data = (result as { data?: T } | undefined)?.data;

      if (data) {
        setItems((prev) => {
          if (prev.some((item) => item.id === data.id)) {
            return prev.filter((item) => item.id !== temp.id);
          }

          return prev.map((item) => (item.id === temp.id ? data : item));
        });
      }
    } catch {
      setItems((prev) => prev.filter((item) => item.id !== temp.id));
      toast.error("Une erreur est survenue");
    } finally {
      pendingTempId.current = null;
      setIsCreating(false);
    }
  };

  const renameEntity = async (id: string, name: string) => {
    const previous = items;

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));

    const result = await renameAsync(config.buildRenameInput(id, name));

    if (hasError(result)) {
      setItems(previous);
      toast.error(getErrorMessage(result as { serverError?: unknown }));
    }
  };

  const deleteEntity = async (id: string) => {
    const previous = items;

    setItems((prev) => prev.filter((item) => item.id !== id));

    const result = await deleteAsync(config.buildDeleteInput(id));

    if (hasError(result)) {
      setItems(previous);
      toast.error(getErrorMessage(result as { serverError?: unknown }));
    }
  };

  return {
    items,
    isCreating,
    createEntity,
    renameEntity,
    deleteEntity,
  };
}

export function useOptimisticChatList<T extends { id: string; title: string }>(
  initialItems: T[],
  config: {
    createAction: SafeAction;
    renameAction: SafeAction;
    deleteAction: SafeAction;
    buildCreateInput: () => Record<string, unknown>;
    buildRenameInput: (id: string, title: string) => Record<string, unknown>;
    buildDeleteInput: (id: string) => Record<string, unknown>;
    messages: EntityListMessages;
    onCreated: (chat: T) => void;
  }
) {
  const [items, setItems] = useState(initialItems);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const { executeAsync: createAsync } = useAction(config.createAction as Parameters<typeof useAction>[0]);
  const { executeAsync: renameAsync } = useAction(config.renameAction as Parameters<typeof useAction>[0]);
  const { executeAsync: deleteAsync } = useAction(config.deleteAction as Parameters<typeof useAction>[0]);

  const createEntity = async () => {
    setIsCreating(true);
    toast.success(config.messages.created);

    try {
      const result = await createAsync(config.buildCreateInput());

      if (hasError(result)) {
        toast.error(getErrorMessage(result as { serverError?: unknown }));
        return;
      }

      const data = (result as { data?: T } | undefined)?.data;

      if (data) {
        config.onCreated(data);
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setIsCreating(false);
    }
  };

  const renameEntity = async (id: string, title: string) => {
    const previous = items;

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, title } : item)));

    const result = await renameAsync(config.buildRenameInput(id, title));

    if (hasError(result)) {
      setItems(previous);
      toast.error(getErrorMessage(result as { serverError?: unknown }));
    }
  };

  const deleteEntity = async (id: string) => {
    const previous = items;

    setItems((prev) => prev.filter((item) => item.id !== id));

    const result = await deleteAsync(config.buildDeleteInput(id));

    if (hasError(result)) {
      setItems(previous);
      toast.error(getErrorMessage(result as { serverError?: unknown }));
    }
  };

  return {
    items,
    isCreating,
    createEntity,
    renameEntity,
    deleteEntity,
  };
}
