import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Account",
};

function accountStatusLabel(verificationStatus: string | null | undefined) {
  if (verificationStatus === "email_verified") {
    return "Verified";
  }
  return "Pending verification";
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: customer }] = await Promise.all([
    supabase
      .from("customer_profiles")
      .select("legal_first_name, legal_last_name")
      .eq("customer_id", user.id)
      .maybeSingle(),
    supabase
      .from("customers")
      .select("verification_status")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const legalFirstName = profile?.legal_first_name ?? "—";
  const legalLastName = profile?.legal_last_name ?? "—";
  const email = user.email ?? "—";
  const statusLabel = accountStatusLabel(customer?.verification_status);

  return (
    <PageContainer>
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Your profile
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Read-only summary of your ZeroLoss identity. Editing comes later.
        </p>

        <dl className="mt-8 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="px-5 py-4 sm:px-6">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              First name
            </dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">
              {legalFirstName}
            </dd>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Last name
            </dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">
              {legalLastName}
            </dd>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Email
            </dt>
            <dd className="mt-1 break-all text-sm text-[var(--foreground)]">
              {email}
            </dd>
          </div>
          <div className="px-5 py-4 sm:px-6">
            <dt className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted)]">
              Account status
            </dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">
              {statusLabel}
            </dd>
          </div>
        </dl>
      </div>
    </PageContainer>
  );
}
