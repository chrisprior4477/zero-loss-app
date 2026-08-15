import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign up",
};

export default async function SignUpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email_confirmed_at) {
    redirect("/account");
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Create your ZeroLoss account
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--foreground)] underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <div className="mt-8">
          <SignUpForm />
        </div>
      </div>
    </PageContainer>
  );
}
