import { notFound } from "next/navigation";
import { isSuperAdminEnabled } from "@/lib/admin/guard";
import { createAdminClient } from "@/utils/supabase/admin";
import AdminDashboard, { type AdminCompany, type AdminUser } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isSuperAdminEnabled())) {
    notFound();
  }

  const admin = createAdminClient();

  const [{ data: companies }, { data: members }, usersResult] = await Promise.all([
    admin.from("companies").select("*").order("name", { ascending: true }),
    admin.from("company_members").select("company_id, user_id"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const membershipsByUser = new Map<string, string[]>();

  for (const member of members ?? []) {
    const existing = membershipsByUser.get(member.user_id) ?? [];
    existing.push(member.company_id);
    membershipsByUser.set(member.user_id, existing);
  }

  const users: AdminUser[] = usersResult.data.users.map((user) => ({
    id: user.id,
    email: user.email ?? "(no email)",
    companyIds: membershipsByUser.get(user.id) ?? [],
  }));

  const companyList: AdminCompany[] = (companies ?? []).map((company) => ({
    id: company.id,
    name: company.name,
  }));

  return <AdminDashboard companies={companyList} users={users} />;
}
