"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { signInReturnPath } from "@/lib/auth/entry-return";
import { passwordUpdateErrorMessage } from "@/lib/auth/password-update-error";
import {
  isAtLeastAge,
  isPasswordValid,
  MIN_ACCOUNT_AGE_YEARS,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/validation";

export type AuthActionState = {
  ok: boolean;
  message: string | null;
  accountMayExist?: boolean;
  pendingVerification?: boolean;
  email?: string;
  /** Non-secret fields to re-populate after a validation error. */
  values?: {
    legal_first_name: string;
    legal_last_name: string;
    date_of_birth: string;
    email: string;
  };
  /** Field-scoped error for confirm password (shown next to that input). */
  confirmPasswordError?: string | null;
};

export type ResendVerificationState = {
  ok: boolean;
  message: string | null;
};

export type PasswordRecoveryState = {
  status: "idle" | "sent" | "updated" | "error";
  message: string | null;
};

function asTrimmedString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function preservedSignupValues(input: {
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  email: string;
}): AuthActionState["values"] {
  return {
    legal_first_name: input.legalFirstName,
    legal_last_name: input.legalLastName,
    date_of_birth: input.dateOfBirth,
    email: input.email,
  };
}

async function getSiteOrigin(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) {
    return origin;
  }

  const host = headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function getRecoveryCallbackOrigin(): Promise<string> {
  // Supabase permits the stable Vercel branch and production URLs, not each
  // one-off deployment URL. Email links must point at an allowed, current host.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return getSiteOrigin();
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const legalFirstName = asTrimmedString(formData.get("legal_first_name"));
  const legalLastName = asTrimmedString(formData.get("legal_last_name"));
  const dateOfBirth = asTrimmedString(formData.get("date_of_birth"));
  const email = asTrimmedString(formData.get("email")).toLowerCase();
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  const confirmPassword =
    typeof formData.get("confirm_password") === "string"
      ? (formData.get("confirm_password") as string)
      : "";
  const acceptedTerms = formData.get("accepted_terms") === "on";
  const values = preservedSignupValues({
    legalFirstName,
    legalLastName,
    dateOfBirth,
    email,
  });

  if (
    !legalFirstName ||
    !legalLastName ||
    !dateOfBirth ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return {
      ok: false,
      message: "Please fill in all required fields.",
      values,
    };
  }

  if (!acceptedTerms) {
    return {
      ok: false,
      message: "You must agree to the Terms of Service and Privacy Policy.",
      values,
    };
  }

  if (!isPasswordValid(password)) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      values,
    };
  }

  if (password !== confirmPassword) {
    return {
      ok: false,
      message: null,
      confirmPasswordError: "Passwords do not match.",
      values,
    };
  }

  if (!isAtLeastAge(dateOfBirth, MIN_ACCOUNT_AGE_YEARS)) {
    return {
      ok: false,
      message: `You must be at least ${MIN_ACCOUNT_AGE_YEARS} years old to create an account.`,
      values,
    };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const termsAcceptedAt = new Date().toISOString();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
      data: {
        legal_first_name: legalFirstName,
        legal_last_name: legalLastName,
        date_of_birth: dateOfBirth,
        terms_accepted_at: termsAcceptedAt,
      },
    },
  });

  if (error) {
    const lowered = error.message.toLowerCase();
    if (
      lowered.includes("already registered") ||
      lowered.includes("already been registered") ||
      lowered.includes("user already exists")
    ) {
      return {
        ok: false,
        accountMayExist: true,
        message:
          "An account may already exist for this email. Sign in or request a new verification email.",
        values,
      };
    }

    return {
      ok: false,
      message: error.message,
      values,
    };
  }

  // Supabase may return a user with empty identities when the email is taken
  // (anti-enumeration). Treat as a soft failure without confirming existence.
  if (
    data.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    return {
      ok: false,
      accountMayExist: true,
      message:
        "An account may already exist for this email. Sign in or request a new verification email.",
      values,
    };
  }

  // Require email verification before a usable session.
  if (data.session) {
    await supabase.auth.signOut();
  }

  return {
    ok: true,
    message: null,
    pendingVerification: true,
    email,
  };
}

export async function resendVerificationAction(
  _prev: ResendVerificationState,
  formData: FormData
): Promise<ResendVerificationState> {
  const email = asTrimmedString(formData.get("verification_email")).toLowerCase();

  if (!email) {
    return { ok: false, message: "Enter the email address used to create your account." };
  }

  const supabase = await createClient();
  const origin = await getSiteOrigin();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    return {
      ok: false,
      message: "We could not send a new verification email yet. Please wait a moment and try again.",
    };
  }

  return {
    ok: true,
    message: "If that account is waiting for verification, a new email is on its way.",
  };
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = asTrimmedString(formData.get("email")).toLowerCase();
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  const returnTo = signInReturnPath(formData.get("returnTo"));

  if (!email || !password) {
    return {
      ok: false,
      message: "Please enter your email and password.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const lowered = error.message.toLowerCase();

    if (
      lowered.includes("email not confirmed") ||
      lowered.includes("not confirmed")
    ) {
      return {
        ok: false,
        message:
          "Please verify your email before signing in. Check your inbox for the confirmation link, and check spam or junk if it is not there.",
      };
    }

    return {
      ok: false,
      message: "Invalid email or password.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: "Invalid email or password.",
    };
  }

  if (!user.email_confirmed_at) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message:
        "Please verify your email before signing in. Check your inbox for the confirmation link, and check spam or junk if it is not there.",
    };
  }

  redirect(returnTo ?? "/account/entries");
}

export async function requestPasswordResetAction(
  _prev: PasswordRecoveryState,
  formData: FormData
): Promise<PasswordRecoveryState> {
  const email = asTrimmedString(formData.get("email")).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = await getRecoveryCallbackOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // The existing callback is already used by confirmation emails and can
    // exchange the PKCE code before sending recovery visitors to the form.
    redirectTo: `${origin}/auth/confirm?flow=recovery`,
  });

  if (error) {
    return {
      status: "error",
      message: "We couldn't send a reset email right now. Please wait a minute and try again.",
    };
  }

  return {
    status: "sent",
    message: "If a Zero Loss account uses that email, a password-reset link is on its way. Check your inbox and spam folder.",
  };
}

export async function updateRecoveredPasswordAction(
  _prev: PasswordRecoveryState,
  formData: FormData
): Promise<PasswordRecoveryState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");
  if (!isPasswordValid(password)) {
    return { status: "error", message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.` };
  }
  if (password !== confirmation) {
    return { status: "error", message: "The two passwords don't match." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { status: "error", message: "This reset link has expired. Request a new password-reset email." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { status: "error", message: passwordUpdateErrorMessage(error) };
  }

  await supabase.auth.signOut();
  // Signing out changes cookies and re-renders the server page. Returning a
  // client-only success state here lets the no-session branch replace it.
  // Use a separate, refresh-safe success view that doesn't require a session.
  redirect("/reset-password?updated=1");
}

export async function changeAccountPasswordAction(
  _prev: PasswordRecoveryState,
  formData: FormData
): Promise<PasswordRecoveryState> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) {
    return { status: "error", message: "Enter your current password." };
  }
  if (!isPasswordValid(password)) {
    return { status: "error", message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.` };
  }
  if (password !== confirmation) {
    return { status: "error", message: "The two new passwords don't match." };
  }
  if (password === currentPassword) {
    return { status: "error", message: "Choose a new password that's different from your current one." };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user?.email) {
    return { status: "error", message: "Sign in again, or use the email reset link to change your password." };
  }

  // Verify ownership and create a recent session before changing credentials.
  const { data: reauthenticated, error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError || reauthenticated.user?.id !== user.id) {
    return { status: "error", message: "Current password was not accepted. Try again or reset it by email." };
  }

  const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
  if (error) {
    return { status: "error", message: passwordUpdateErrorMessage(error) };
  }

  return { status: "updated", message: "Your password has been changed. You can keep using your account." };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
