"use client";

import { useEffect } from "react";
import { create } from "zustand";
import type { BreadcrumbItem } from "@/app/components/workspace/WorkspaceBreadcrumb";

interface HeaderState {
  items: BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
}

export const useHeaderStore = create<HeaderState>()((set) => ({
  items: [],
  setItems: (items) => {
    set({ items });
  },
}));

/**
 * Sets the breadcrumb shown in the persistent app header. The header lives in
 * the company layout so it stays visible (with its breadcrumb) during route
 * loading transitions.
 */
export function useHeaderItems(items: BreadcrumbItem[]): void {
  const setItems = useHeaderStore((s) => s.setItems);

  // biome-ignore lint/correctness/useExhaustiveDependencies: items identity changes each render; serialize to compare
  useEffect(() => {
    setItems(items);
  }, [JSON.stringify(items), setItems]);
}
