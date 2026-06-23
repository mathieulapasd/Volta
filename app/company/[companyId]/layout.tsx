import type { ReactNode } from "react";
import { listUserCompanies } from "@/app/actions/company";
import AppHeader from "@/app/components/workspace/AppHeader";

interface CompanyLayoutProps {
  children: ReactNode;
  params: Promise<{ companyId: string }>;
}

export default async function CompanyLayout({ children, params }: CompanyLayoutProps) {
  const { companyId } = await params;
  const companies = await listUserCompanies();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader companyId={companyId} companies={companies} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
