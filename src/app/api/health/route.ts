import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return NextResponse.json({
    status: "ok",
    supabaseUrlConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    supabasePublishableKeyConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ),
    userPresent: Boolean(user),
    authError: error ? error.message : null,
  });
}