import { memo, useMemo, useRef } from "react";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select";
import { debounce } from "@/lib/debounce";

export const IsolatedSelect = memo(function IsolatedSelect(props: {
  initialValue: string;
  onCommit: (value: string) => void;
  onBlur?: () => void;
  children: React.ReactNode;
  placeholder?: string;
}) {
  const valueRef = useRef(props.initialValue);

  const commit = useMemo(
    () =>
      debounce((v: string) => {
        valueRef.current = v;
        props.onCommit(v);
      }, 0),
    [props.onCommit]
  );

  return (
    <Select
      defaultValue={props.initialValue}
      onValueChange={(v) => commit(v)}
      onOpenChange={(open) => {
        if (!open) {
          props.onBlur?.();
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={props.placeholder} />
      </SelectTrigger>
      <SelectContent>{props.children}</SelectContent>
    </Select>
  );
});
