"use client";

import { createContext, useContext, useLayoutEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";

type ProductTitle = { slug: string; title: string } | null;
const Title = createContext<ProductTitle>(null);
const SetTitle = createContext<Dispatch<SetStateAction<ProductTitle>> | null>(null);

/** The server-rendered product supplies its own name; no second catalog is sent to every page. */
export function ProductBreadcrumbTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<ProductTitle>(null);
  return <SetTitle value={setTitle}><Title value={title}>{children}</Title></SetTitle>;
}

export function ProductBreadcrumbTitle({ slug, title }: NonNullable<ProductTitle>) {
  const setTitle = useContext(SetTitle);
  useLayoutEffect(() => {
    const current = { slug, title };
    setTitle?.(current);
    return () => setTitle?.(saved => saved === current ? null : saved);
  }, [setTitle, slug, title]);
  return null;
}

export function useProductBreadcrumbTitle(pathname: string) {
  const current = useContext(Title);
  return current && pathname === `/items/${current.slug}` ? current.title : undefined;
}
