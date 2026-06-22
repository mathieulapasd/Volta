import { ChevronRight } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface WorkspaceBreadcrumbProps {
  items?: BreadcrumbItem[];
  actions?: ReactNode;
  className?: string;
}

export default function WorkspaceBreadcrumb({
  items = [],
  actions,
  className,
}: WorkspaceBreadcrumbProps): ReactElement {
  return (
    <header
      className={cn(
        "flex h-15 items-center justify-between border-primary-foreground/20 border-b bg-primary px-4",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
        <Link href="/" className="mt-1 shrink-0">
          <Image src="/Logo_Volta_Jaune.png" alt="Logo" width={80} height={40} priority />
        </Link>
        {items.length > 0 && (
          <nav className="flex min-w-0 items-center gap-1 border-primary-foreground/20 border-l pl-4 text-primary-foreground text-sm">
            {items.map((item, index) => {
              const isLast = index === items.length - 1;

              return (
                <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {index > 0 && <ChevronRight className="size-4 shrink-0 text-primary-foreground/60" />}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href as Route}
                      className="truncate text-primary-foreground/75 hover:text-primary-foreground"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        "truncate",
                        isLast ? "font-medium text-primary-foreground" : "text-primary-foreground/75"
                      )}
                    >
                      {item.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        )}
      </div>
      {actions ? <div className="ml-4 shrink-0">{actions}</div> : null}
    </header>
  );
}
