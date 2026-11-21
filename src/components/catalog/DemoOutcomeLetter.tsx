"use client";

import { createContext, useContext } from "react";
import { catalogSlugFromHref } from "@/lib/catalog/demo-visibility";

const DemoOutcomeMarksContext = createContext<Partial<Record<string, "W" | "P">>>({});
export const DemoOutcomeMarksProvider = DemoOutcomeMarksContext.Provider;

export function DemoOutcomeLetter({ product, dark = false, position = "left-2 top-2" }: {
  product?: string;
  dark?: boolean;
  position?: string;
}) {
  const marks = useContext(DemoOutcomeMarksContext);
  const slug = product?.startsWith("/") ? catalogSlugFromHref(product) : product;
  const mark = slug ? marks[slug] : undefined;
  if (!mark) return null;
  const color = dark
    ? (mark === "W" ? "text-[#b0ecb6]/60" : "text-[#ffc799]/60")
    : (mark === "W" ? "text-[#468956]/60" : "text-[#ae652e]/60");

  return (
    <span
      aria-label={mark === "W" ? "Scripted demo winner" : "Scripted demo purchase option"}
      className={`pointer-events-none absolute z-20 select-none text-[10px] font-extrabold leading-none ${position} ${color}`}
      data-demo-outcome={mark}
      role="img"
    >
      {mark}
    </span>
  );
}
