"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { MenuLayout } from "@/lib/navigation/menu-layout";

type MenuChoice = {
  layout: MenuLayout;
  savedLayout: MenuLayout;
  preview: (layout: MenuLayout) => void;
  keep: (layout: MenuLayout) => void;
  cancel: () => void;
};
const MenuLayoutContext = createContext<MenuChoice | null>(null);

export function MenuLayoutProvider({ initialLayout, children }: { initialLayout: MenuLayout; children: ReactNode }) {
  const [savedLayout, setSavedLayout] = useState(initialLayout);
  const [layout, setLayout] = useState(initialLayout);
  return <MenuLayoutContext.Provider value={{
    layout, savedLayout,
    preview: setLayout,
    keep: choice => { setSavedLayout(choice); setLayout(choice); },
    cancel: () => setLayout(savedLayout),
  }}>{children}</MenuLayoutContext.Provider>;
}

export function useMenuLayout() {
  const choice = useContext(MenuLayoutContext);
  if (!choice) throw new Error("Menu choices require MenuLayoutProvider.");
  return choice;
}
