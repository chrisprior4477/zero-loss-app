import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; verified?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email_confirmed_at) {
    redirect("/account");
  }

  const params = await searchParams;
  const initialError =
    params.error === "verification_failed"
      ? "Email verification failed or expired. Request a new link by signing up again, or contact support."
      : null;
  const initialNotice =
    params.verified === "1"
      ? "Email verified. Sign in to continue."
      : null;

  return (
    <PageContainer>
      <div className="mx-auto max-w-lg">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          New here?{" "}
          <Link
            href="/signup"
            className="text-[var(--foreground)] underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </p>
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
          <LoginForm
            initialError={initialError}
            initialNotice={initialNotice}
          />
        </div>
      </div>
    </PageContainer>
  );
}
