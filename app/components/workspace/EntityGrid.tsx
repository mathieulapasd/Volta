"use client";

import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EntityGridProps {
  children: ReactNode;
  className?: string;
}

export default function EntityGrid({ children, className }: EntityGridProps): ReactElement {
  return <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>{children}</div>;
}
