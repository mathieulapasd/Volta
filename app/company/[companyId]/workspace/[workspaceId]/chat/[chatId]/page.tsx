import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getChat, getWorkspace } from "@/app/actions/workspace";
import EmailBuilderHtml from "@/app/components/EmailBuilderHtml";
import ChatInitializer from "@/app/components/workspace/ChatInitializer";

interface ChatBuilderPageProps {
  params: Promise<{ companyId: string; workspaceId: string; chatId: string }>;
}

export default async function ChatBuilderPage({ params }: ChatBuilderPageProps) {
  const { companyId, workspaceId, chatId } = await params;

  const [workspace, chatData] = await Promise.all([
    getWorkspace(workspaceId, companyId),
    getChat(chatId, workspaceId, companyId),
  ]);

  if (!workspace || !chatData) {
    notFound();
  }

  const layout = (await cookies()).get("react-resizable-panels:layout");
  let defaultLayout = [50, 50];
  if (layout) {
    defaultLayout = JSON.parse(decodeURIComponent(layout.value));
  }

  return (
    <>
      <ChatInitializer messages={chatData.messages} unlayerDesign={null} />
      <main className="flex h-screen bg-background">
        <EmailBuilderHtml
          defaultLayout={defaultLayout}
          companyId={companyId}
          chatId={chatId}
          workspaceId={workspaceId}
          workspaceName={workspace.name}
          chatTitle={chatData.chat.title}
        />
      </main>
    </>
  );
}
