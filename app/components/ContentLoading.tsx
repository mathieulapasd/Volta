import { Loader2 } from "lucide-react";
import type { ReactElement } from "react";

interface ContentLoadingProps {
  label?: string;
}

export default function ContentLoading({ label = "Chargement..." }: ContentLoadingProps): ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
