import { notFound } from "next/navigation";
import { getWorkspace, listChats } from "@/app/actions/workspace";
import ChatList from "@/app/components/workspace/ChatList";

interface WorkspacePageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;
  const workspace = await getWorkspace(workspaceId);

  if (!workspace) {
    notFound();
  }

  const chats = await listChats(workspaceId);

  return <ChatList workspace={workspace} chats={chats} />;
}
