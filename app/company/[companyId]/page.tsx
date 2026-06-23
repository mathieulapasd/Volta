import { notFound } from "next/navigation";
import { listUserCompanies } from "@/app/actions/company";
import { listWorkspaces } from "@/app/actions/workspace";
import WorkspaceList from "@/app/components/workspace/WorkspaceList";

interface CompanyPageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { companyId } = await params;

  const companies = await listUserCompanies();

  if (!companies.some((company) => company.id === companyId)) {
    notFound();
  }

  const workspaces = await listWorkspaces(companyId);

  return <WorkspaceList companyId={companyId} workspaces={workspaces} />;
}
