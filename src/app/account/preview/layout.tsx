import { redirect } from "next/navigation";
import { canAccessInvestorPreview } from "@/lib/demo/access";

export default async function InvestorPreviewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (!(await canAccessInvestorPreview())) {
    redirect("/login");
  }

  return children;
}
