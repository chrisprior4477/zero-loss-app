import type { ReactNode } from "react";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "main";
  wide?: boolean;
};

export function PageContainer({
  children,
  className = "",
  as: Tag = "div",
  wide = false,
}: PageContainerProps) {
  return (
    <Tag
      className={`mx-auto w-full ${wide ? "max-w-none px-4 sm:px-6 lg:px-[clamp(3rem,6vw,7rem)]" : "max-w-6xl px-4 sm:px-6 lg:px-8"} py-8 sm:py-10 ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
