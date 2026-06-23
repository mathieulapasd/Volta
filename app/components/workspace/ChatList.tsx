"use client";

import { MessageSquare } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { createChatAction, deleteChatAction, renameChatAction } from "@/app/actions/workspace-mutations";
import type { Tables } from "@/database.types";
import { useOptimisticChatList } from "@/lib/workspace/use-optimistic-entities";
import CreateTile from "./CreateTile";
import EntityGrid from "./EntityGrid";
import EntityTile from "./EntityTile";
import WorkspaceBreadcrumb from "./WorkspaceBreadcrumb";

interface ChatListProps {
  companyId: string;
  workspace: Tables<"workspaces">;
  chats: Tables<"chats">[];
}

export default function ChatList({ companyId, workspace, chats }: ChatListProps): ReactElement {
  const router = useRouter();
  const chatBasePath = `/company/${companyId}/workspace/${workspace.id}/chat`;

  const { items, isCreating, createEntity, renameEntity, deleteEntity } = useOptimisticChatList(chats, {
    createAction: createChatAction,
    renameAction: renameChatAction,
    deleteAction: deleteChatAction,
    buildCreateInput: () => ({ companyId, workspaceId: workspace.id }),
    buildRenameInput: (id, title) => ({ id, companyId, workspaceId: workspace.id, title }),
    buildDeleteInput: (id) => ({ id, companyId, workspaceId: workspace.id }),
    messages: {
      created: "Chat créé",
      renamed: "Chat renommé",
      deleted: "Chat supprimé",
    },
    onCreated: (chat) => {
      router.push(`${chatBasePath}/${chat.id}` as Route);
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WorkspaceBreadcrumb
        items={[{ label: "Espaces de travail", href: `/company/${companyId}` }, { label: workspace.name }]}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 p-6">
        <div className="mb-6">
          <h1 className="font-semibold text-xl">{workspace.name}</h1>
          <p className="text-muted-foreground text-sm">Ouvrez un chat pour créer un e-mail ou créez-en un nouveau.</p>
        </div>

        <EntityGrid>
          <CreateTile label="Nouveau chat" onClick={createEntity} disabled={isCreating} />
          {items.map((chat) => (
            <EntityTile
              key={chat.id}
              href={`${chatBasePath}/${chat.id}` as Route}
              icon={<MessageSquare className="size-8 shrink-0 text-primary" />}
              name={chat.title}
              onRename={(title) => renameEntity(chat.id, title)}
              onDelete={() => deleteEntity(chat.id)}
              deleteEntityLabel="ce chat"
              deleteDescription="Tous les messages de ce chat seront supprimés définitivement."
              deleteAriaLabel="Supprimer le chat"
            />
          ))}
        </EntityGrid>

        {items.length === 0 && !isCreating && (
          <p className="mt-8 text-center text-muted-foreground text-sm">
            Aucun chat. Cliquez sur « Nouveau chat » pour commencer.
          </p>
        )}
      </main>
    </div>
  );
}
