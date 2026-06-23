import { notFound } from "next/navigation";
import { getWorkspace, listChats } from "@/app/actions/workspace";
import ChatList from "@/app/components/workspace/ChatList";

interface WorkspacePageProps {
  params: Promise<{ companyId: string; workspaceId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { companyId, workspaceId } = await params;

  const workspace = await getWorkspace(workspaceId, companyId);

  if (!workspace) {
    notFound();
  }

  const chats = await listChats(workspaceId, companyId);

  return <ChatList companyId={companyId} workspace={workspace} chats={chats} />;
}
