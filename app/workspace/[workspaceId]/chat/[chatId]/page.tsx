import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

interface LegacyChatPageProps {
  params: Promise<{ workspaceId: string; chatId: string }>;
}

export default async function LegacyChatPage({ params }: LegacyChatPageProps) {
  const { workspaceId, chatId } = await params;

  if (!z.uuid().safeParse(workspaceId).success || !z.uuid().safeParse(chatId).success) {
    notFound();
  }

  const supabase = await createClient();

  const { data } = await supabase.from("workspaces").select("company_id").eq("id", workspaceId).maybeSingle();

  if (!data) {
    notFound();
  }

  redirect(`/company/${data.company_id}/workspace/${workspaceId}/chat/${chatId}` as Route);
}
