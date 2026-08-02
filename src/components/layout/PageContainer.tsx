import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "main";
};

export function PageContainer({
  children,
  className = "",
  as: Tag = "div",
}: PageContainerProps) {
  return (
    <Tag
      className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
