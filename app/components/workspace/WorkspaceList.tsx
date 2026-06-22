"use client";

import { FolderOpen, LogOut } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { createWorkspaceAction, deleteWorkspaceAction, renameWorkspaceAction } from "@/app/actions/workspace-mutations";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/database.types";
import { useOptimisticEntityList } from "@/lib/workspace/use-optimistic-entities";
import { createClient } from "@/utils/supabase/client";
import CreateTile from "./CreateTile";
import EntityGrid from "./EntityGrid";
import EntityTile from "./EntityTile";
import WorkspaceBreadcrumb from "./WorkspaceBreadcrumb";

interface WorkspaceListProps {
  workspaces: Tables<"workspaces">[];
}

export default function WorkspaceList({ workspaces }: WorkspaceListProps): ReactElement {
  const router = useRouter();

  const { items, isCreating, createEntity, renameEntity, deleteEntity } = useOptimisticEntityList(workspaces, {
    createAction: createWorkspaceAction,
    renameAction: renameWorkspaceAction,
    deleteAction: deleteWorkspaceAction,
    buildCreateInput: () => ({}),
    buildRenameInput: (id, name) => ({ id, name }),
    buildDeleteInput: (id) => ({ id }),
    messages: {
      created: "Espace de travail créé",
      renamed: "Espace de travail renommé",
      deleted: "Espace de travail supprimé",
    },
  });

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WorkspaceBreadcrumb
        actions={
          <Button
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            onClick={handleLogout}
          >
            <LogOut />
            Se déconnecter
          </Button>
        }
      />

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
              href={`/workspace/${workspace.id}` as Route}
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
    </div>
  );
}
