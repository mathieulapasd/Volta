import { listWorkspaces } from "@/app/actions/workspace";
import WorkspaceList from "@/app/components/workspace/WorkspaceList";

export default async function HomePage() {
  const workspaces = await listWorkspaces();

  return <WorkspaceList workspaces={workspaces} />;
}
