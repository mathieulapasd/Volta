import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getChat, getWorkspace } from "@/app/actions/workspace";
import EmailBuilder from "@/app/components/EmailBuilder";
import ChatInitializer from "@/app/components/workspace/ChatInitializer";
import { getDefaultUnlayerDesign } from "@/lib/defaultUnlayerDesign";
import type { UnlayerDesign } from "@/lib/schemas";
import { unlayerDesignSchema } from "@/lib/schemas";

interface ChatBuilderPageProps {
  params: Promise<{ companyId: string; workspaceId: string; chatId: string }>;
}

async function resolveUnlayerDesign(raw: unknown): Promise<UnlayerDesign | null> {
  if (!raw) {
    return null;
  }

  const parsed = unlayerDesignSchema.safeParse(raw);

  if (parsed.success) {
    return parsed.data;
  }

  return null;
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

  let unlayerDesign = await resolveUnlayerDesign(chatData.chat.unlayer_design);

  if (!unlayerDesign) {
    unlayerDesign = await getDefaultUnlayerDesign();
  }

  return (
    <>
      <ChatInitializer messages={chatData.messages} unlayerDesign={unlayerDesign} />
      <main className="flex h-screen bg-background">
        <EmailBuilder
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
