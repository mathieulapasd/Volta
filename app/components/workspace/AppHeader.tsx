"use client";

import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactElement } from "react";
import CompanySwitcher from "@/app/components/company/CompanySwitcher";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/database.types";
import { useHeaderStore } from "@/lib/store/useHeaderStore";
import { createClient } from "@/utils/supabase/client";
import WorkspaceBreadcrumb from "./WorkspaceBreadcrumb";

interface AppHeaderProps {
  companyId: string;
  companies: Tables<"companies">[];
}

export default function AppHeader({ companyId, companies }: AppHeaderProps): ReactElement | null {
  const pathname = usePathname();
  const router = useRouter();
  const items = useHeaderStore((s) => s.items);

  // The chat builder is a full-screen split with its own in-pane header.
  if (pathname?.includes("/chat/")) {
    return null;
  }

  const isMainPage = pathname === `/company/${companyId}`;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <WorkspaceBreadcrumb
      items={items}
      actions={
        isMainPage ? (
          <div className="flex items-center gap-2">
            <CompanySwitcher companies={companies} currentCompanyId={companyId} />
            <Button
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              onClick={handleLogout}
            >
              <LogOut />
              Se déconnecter
            </Button>
          </div>
        ) : null
      }
    />
  );
}
