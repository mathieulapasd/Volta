import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";
import WorkspaceBreadcrumb from "@/app/components/workspace/WorkspaceBreadcrumb";

interface LoadingScreenProps {
  label?: string;
}

export default function LoadingScreen({ label = "Chargement..." }: LoadingScreenProps): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <WorkspaceBreadcrumb />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}
