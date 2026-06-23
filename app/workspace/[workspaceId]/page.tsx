import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

interface LegacyWorkspacePageProps {
  params: Promise<{ workspaceId: string }>;
}

export default async function LegacyWorkspacePage({ params }: LegacyWorkspacePageProps) {
  const { workspaceId } = await params;

  if (!z.uuid().safeParse(workspaceId).success) {
    notFound();
  }

  const supabase = await createClient();

  const { data } = await supabase.from("workspaces").select("company_id").eq("id", workspaceId).maybeSingle();

  if (!data) {
    notFound();
  }

  redirect(`/company/${data.company_id}/workspace/${workspaceId}` as Route);
}
