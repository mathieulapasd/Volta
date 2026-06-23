"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/database.types";

interface CompanySwitcherProps {
  companies: Tables<"companies">[];
  currentCompanyId: string;
}

export default function CompanySwitcher({ companies, currentCompanyId }: CompanySwitcherProps): ReactElement | null {
  const router = useRouter();

  if (companies.length <= 1) {
    return null;
  }

  return (
    <Select
      value={currentCompanyId}
      onValueChange={(value) => {
        if (value !== currentCompanyId) {
          router.push(`/company/${value}` as Route);
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="border-primary-foreground/30 bg-transparent text-primary-foreground"
        aria-label="Changer d'entreprise"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
