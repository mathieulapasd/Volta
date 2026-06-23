import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/database.types";

type Client = SupabaseClient<Database>;

export async function assertCompanyMembership(supabase: Client, companyId: string, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Entreprise introuvable");
  }
}

export async function assertWorkspaceInCompany(
  supabase: Client,
  workspaceId: string,
  companyId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Espace de travail introuvable");
  }
}
