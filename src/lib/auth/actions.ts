"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  isAtLeastAge,
  isPasswordValid,
  MIN_ACCOUNT_AGE_YEARS,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/validation";

export type AuthActionState = {
  ok: boolean;
  message: string | null;
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

  let data: Awaited<ReturnType<typeof supabase.auth.signUp>>["data"];
  let error: Awaited<ReturnType<typeof supabase.auth.signUp>>["error"];

  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=/login`,
        data: {
          legal_first_name: legalFirstName,
          legal_last_name: legalLastName,
          date_of_birth: dateOfBirth,
          terms_accepted_at: termsAcceptedAt,
        },
      },
    });
    data = result.data;
    error = result.error;
  } catch (thrown) {
    // TEMPORARY debug logging — remove after diagnosing "fetch failed"
    console.error("[signUpAction] supabase.auth.signUp threw", thrown);
    if (thrown && typeof thrown === "object" && "cause" in thrown) {
      console.error("[signUpAction] thrown.cause", (thrown as { cause: unknown }).cause);
    }
    console.error(
      "[signUpAction] thrown JSON",
      JSON.stringify(thrown, Object.getOwnPropertyNames(thrown as object))
    );
    throw thrown;
  }

  if (error) {
    // TEMPORARY debug logging — remove after diagnosing signup failures
    console.error("[signUpAction] supabase.auth.signUp returned error", error);
    if (error && typeof error === "object" && "cause" in error) {
      console.error(
        "[signUpAction] error.cause",
        (error as { cause: unknown }).cause
      );
    }
    console.error(
      "[signUpAction] error JSON",
      JSON.stringify(error, Object.getOwnPropertyNames(error))
    );

    const lowered = error.message.toLowerCase();
    if (
      lowered.includes("already registered") ||
      lowered.includes("already been registered") ||
      lowered.includes("user already exists")
    ) {
      return {
        ok: false,
        message:
          "Unable to create this account. Try signing in, or use a different email.",
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
      message:
        "Unable to create this account. Try signing in, or use a different email.",
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

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = asTrimmedString(formData.get("email")).toLowerCase();
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";

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
          "Please verify your email before signing in. Check your inbox for the confirmation link.",
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
        "Please verify your email before signing in. Check your inbox for the confirmation link.",
    };
  }

  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
