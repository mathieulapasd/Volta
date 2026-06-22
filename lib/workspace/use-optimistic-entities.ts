"use client";

import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
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

export function useOptimisticEntityList<T extends NamedEntity>(
  initialItems: T[],
  config: {
    createAction: SafeAction;
    renameAction: SafeAction;
    deleteAction: SafeAction;
    buildCreateInput: () => Record<string, unknown>;
    buildRenameInput: (id: string, name: string) => Record<string, unknown>;
    buildDeleteInput: (id: string) => Record<string, unknown>;
    messages: EntityListMessages;
  }
) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const { execute: createEntity, isPending: isCreating } = useAction(
    config.createAction as Parameters<typeof useAction>[0],
    {
      onSuccess: ({ data }) => {
        if (data) {
          setItems((prev) => {
            if (prev.some((item) => item.id === (data as T).id)) {
              return prev;
            }

            return [data as T, ...prev];
          });
        }

        toast.success(config.messages.created);
      },
      onError: ({ error }) => {
        toast.error(getErrorMessage(error));
      },
    }
  );

  const { executeAsync: renameAsync } = useAction(config.renameAction as Parameters<typeof useAction>[0], {
    onError: ({ error }) => {
      toast.error(getErrorMessage(error));
    },
  });

  const { executeAsync: deleteAsync } = useAction(config.deleteAction as Parameters<typeof useAction>[0], {
    onError: ({ error }) => {
      toast.error(getErrorMessage(error));
    },
  });

  const renameEntity = async (id: string, name: string) => {
    const previous = items;

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));

    const result = await renameAsync(config.buildRenameInput(id, name));

    if (result?.serverError || result?.validationErrors) {
      setItems(previous);
      return;
    }

    toast.success(config.messages.renamed);
  };

  const deleteEntity = async (id: string) => {
    const previous = items;

    setItems((prev) => prev.filter((item) => item.id !== id));

    const result = await deleteAsync(config.buildDeleteInput(id));

    if (result?.serverError || result?.validationErrors) {
      setItems(previous);
      return;
    }

    toast.success(config.messages.deleted);
  };

  return {
    items,
    isCreating,
    createEntity: () => createEntity(config.buildCreateInput()),
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

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const { execute: createEntity, isPending: isCreating } = useAction(
    config.createAction as Parameters<typeof useAction>[0],
    {
      onSuccess: ({ data }) => {
        if (data) {
          config.onCreated(data as T);
        }

        toast.success(config.messages.created);
      },
      onError: ({ error }) => {
        toast.error(getErrorMessage(error));
      },
    }
  );

  const { executeAsync: renameAsync } = useAction(config.renameAction as Parameters<typeof useAction>[0], {
    onError: ({ error }) => {
      toast.error(getErrorMessage(error));
    },
  });

  const { executeAsync: deleteAsync } = useAction(config.deleteAction as Parameters<typeof useAction>[0], {
    onError: ({ error }) => {
      toast.error(getErrorMessage(error));
    },
  });

  const renameEntity = async (id: string, title: string) => {
    const previous = items;

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, title } : item)));

    const result = await renameAsync(config.buildRenameInput(id, title));

    if (result?.serverError || result?.validationErrors) {
      setItems(previous);
      return;
    }

    toast.success(config.messages.renamed);
  };

  const deleteEntity = async (id: string) => {
    const previous = items;

    setItems((prev) => prev.filter((item) => item.id !== id));

    const result = await deleteAsync(config.buildDeleteInput(id));

    if (result?.serverError || result?.validationErrors) {
      setItems(previous);
      return;
    }

    toast.success(config.messages.deleted);
  };

  return {
    items,
    isCreating,
    createEntity: () => createEntity(config.buildCreateInput()),
    renameEntity,
    deleteEntity,
  };
}
