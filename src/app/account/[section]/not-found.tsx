import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";

export default function AccountSectionNotFound() {
  return <PageContainer>
    <section className="rounded-2xl border border-cyan-300/25 bg-[#052344] p-6 text-white">
      <h1 className="text-2xl font-black">This account section is unavailable</h1>
      <p className="mt-2 text-white/75">You can return to your saved entries and results in My Activity.</p>
      <Link href="/account/entries#my-activity-filters" className="mt-4 inline-flex min-h-11 items-center font-bold text-cyan-300 underline">
        Back to My Activity →
      </Link>
    </section>
  </PageContainer>;
}
