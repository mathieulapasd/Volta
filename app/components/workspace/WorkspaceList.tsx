"use client";

import { FolderOpen } from "lucide-react";
import type { Route } from "next";
import type { ReactElement } from "react";
import { createWorkspaceAction, deleteWorkspaceAction, renameWorkspaceAction } from "@/app/actions/workspace-mutations";
import type { Tables } from "@/database.types";
import { useHeaderItems } from "@/lib/store/useHeaderStore";
import { DEFAULT_WORKSPACE_NAME } from "@/lib/workspace/defaults";
import { useOptimisticEntityList } from "@/lib/workspace/use-optimistic-entities";
import CreateTile from "./CreateTile";
import EntityGrid from "./EntityGrid";
import EntityTile from "./EntityTile";

interface WorkspaceListProps {
  companyId: string;
  workspaces: Tables<"workspaces">[];
}

function createTempWorkspace(companyId: string): Tables<"workspaces"> {
  const now = new Date().toISOString();

  return {
    id: `temp-${crypto.randomUUID()}`,
    company_id: companyId,
    auth_id: "",
    name: DEFAULT_WORKSPACE_NAME,
    created_at: now,
    updated_at: now,
  };
}

export default function WorkspaceList({ companyId, workspaces }: WorkspaceListProps): ReactElement {
  useHeaderItems([]);

  const { items, isCreating, createEntity, renameEntity, deleteEntity } = useOptimisticEntityList(workspaces, {
    createAction: createWorkspaceAction,
    renameAction: renameWorkspaceAction,
    deleteAction: deleteWorkspaceAction,
    buildCreateInput: () => ({ companyId }),
    buildRenameInput: (id, name) => ({ id, companyId, name }),
    buildDeleteInput: (id) => ({ id, companyId }),
    createTemp: () => createTempWorkspace(companyId),
    messages: {
      created: "Espace de travail créé",
      renamed: "Espace de travail renommé",
      deleted: "Espace de travail supprimé",
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-6">
      <div className="mb-6">
        <h1 className="font-semibold text-xl">Espaces de travail</h1>
        <p className="text-muted-foreground text-sm">
          Créez un espace, puis ajoutez des chats pour construire vos e-mails.
        </p>
      </div>

      <EntityGrid>
        <CreateTile label="Nouvel espace" onClick={createEntity} disabled={isCreating} />
        {items.map((workspace) => (
          <EntityTile
            key={workspace.id}
            href={`/company/${companyId}/workspace/${workspace.id}` as Route}
            disabled={workspace.id.startsWith("temp-")}
            icon={<FolderOpen className="size-8 shrink-0 text-primary" />}
            name={workspace.name}
            onRename={(name) => renameEntity(workspace.id, name)}
            onDelete={() => deleteEntity(workspace.id)}
            deleteEntityLabel="cet espace de travail"
            deleteDescription="Tous les chats et messages associés seront supprimés définitivement."
            deleteAriaLabel="Supprimer l'espace de travail"
          />
        ))}
      </EntityGrid>

      {items.length === 0 && !isCreating && (
        <p className="mt-8 text-center text-muted-foreground text-sm">
          Aucun espace de travail. Cliquez sur « Nouvel espace » pour commencer.
        </p>
      )}
    </main>
  );
}
