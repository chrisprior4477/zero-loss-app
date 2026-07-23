THE DEFINITIVE DAY 1 MASTER MANUAL (FULL CORRECTED EDITION)Day 1 GoalLock the baseline project skeleton in Cursor and Supabase using the frozen architecture and output contract, so future days can add features without re-doing initial wiring.  Day 1 must produce:  A clean Next.js App Router project on Vercel with Tailwind and TypeScript (enforced inside the src/ directory).  Supabase project created and linked, with environment variables wired into Next.js.  A shared server-side Supabase utility using @supabase/ssr.  A health-check route that proves SSR auth and environment wiring are correct.  Step 1 — Create the Next.js App Router ProjectYou will initialize a Next.js App Router project with TypeScript and Tailwind locally, then connect it to Vercel.  ActionsIn Cursor, start a new Next.js App Router project (or use your existing workspace root) and run:  Bashnpx create-next-app@latest zero-loss \
  --typescript \
  --eslint \
  --tailwind \
  --src-dir \
  --app \
  --import-alias "@/*"
Open the new zero-loss folder in Cursor.  Confirm that the src/app/ directory exists and that Tailwind is wired (tailwind.config.ts, postcss.config.js, src/app/globals.css).  Non-Technical Action CheckRun npm install inside the project.  Start the dev server with npm run dev.  Open http://localhost:3000 and confirm the default Next.js page loads.  Plain-English: Day 1 starts by creating the official app skeleton that all later roadmap days will build on.  Step 2 — Create the Supabase Project and Grab KeysYou will create a Supabase project that acts as the backend database and auth provider.  ActionsIn the Supabase dashboard, create a new project named zero-loss.  From the project settings, copy:  The anon public key.  The service-role key (do not paste this into client-side code).  The Supabase project URL.  Keep these available; they will be wired into environment variables in Step 3.  Non-Technical Action CheckConfirm you can open the new Supabase project's SQL Editor and Auth section.  No schema changes yet; Day 1 only wires the connection.  Plain-English: This gives the project a real Postgres + Auth backend that matches the locked architecture.  Step 3 — Wire Environment Variables in Next.jsYou will configure environment variables for Supabase and Stripe (even if Stripe is not used yet, the env wiring should be ready).  📂 TARGET PATH.env.local (project root)  📋 COPY / PASTE BLOCKPlaintext# Supabase project URL and anon key
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY

# Supabase service key — server-side only, never used in the browser
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Stripe placeholder keys — to be populated in later days
STRIPE_SECRET_KEY=sk_test_placeholder
STRIPE_WEBHOOK_SECRET=whsec_placeholder
Replace YOUR-PROJECT.supabase.co, YOUR_ANON_PUBLIC_KEY, and YOUR_SERVICE_ROLE_KEY with your real values from Supabase.  Non-Technical Action CheckSave .env.local.  Restart npm run dev so Next.js picks up new environment variables.  Confirm there are no environment-related errors in the dev console.  Plain-English: Day 1 ensures secrets and public keys are separated correctly, with server-only and client-safe vars defined.  Step 4 — Create the Shared Server-Side Supabase UtilityYou will create a server-side Supabase client helper that uses @supabase/ssr for SSR auth.  📂 TARGET PATHsrc/lib/supabaseServer.ts  📋 COPY / PASTE BLOCKTypeScriptimport { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function getSupabaseServerClient() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Safe catch block for server component execution context
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Safe catch block for server component execution context
          }
        },
      },
    }
  );

  return supabase;
}
This helper will be used in server components, route handlers, and server actions to derive the acting user via supabase.auth.getUser() in later days.  Non-Technical Action CheckCreate src/lib/ if it does not exist and paste the file as supabaseServer.ts.  Restart npm run dev.  Ensure TypeScript compiles with no errors.  Plain-English: This step installs the SSR pattern the architecture requires, instead of ad-hoc client-side Supabase usage.  Step 5 — Implement a Health-Check Route Using SSR AuthYou will create a small API route that proves the SSR client and environment wiring are correct and that the server can call auth.getUser().  📂 TARGET PATHsrc/app/api/health/route.ts (Corrected from root app/)  📋 COPY / PASTE BLOCKTypeScriptimport { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = getSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // This route is safe to call unauthenticated; it just reports status.
  return NextResponse.json({
    status: "ok",
    supabaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    userPresent: Boolean(user),
    authError: error ? error.message : null,
  });
}
Non-Technical Action CheckSave the file at the explicit path src/app/api/health/route.ts.  In your browser, open http://localhost:3000/api/health.  Confirm you receive a JSON response with status: "ok" and the configuration flags.  Plain-English: This route proves that the SSR client is wired, env variables are readable, and future days can safely layer authenticated flows on top.  Step 6 — Baseline Tailwind and App Layout CheckDay 1 should also verify that Tailwind and the App Router layout are ready for future UI specs (homepage, account, etc.).  📂 TARGET PATHsrc/app/layout.tsx (Corrected from root app/)  📋 COPY / PASTE BLOCKTypeScriptimport "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Zero-Loss",
  description: "Zero-loss marketplace baseline skeleton",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
Non-Technical Action CheckSave layout.tsx inside the src/app/ folder.  Reload http://localhost:3000 and confirm the page background is dark and text is light (Tailwind working).  Confirm no layout or CSS errors.  Plain-English: This locks a simple, clear baseline layout that later product specs will replace with real components.  Day 1 End-State StatementBy the end of THE DEFINITIVE DAY 1 MASTER MANUAL, the project must have:  A running Next.js App Router project with TypeScript and Tailwind inside a clean /src directory.  Supabase project created, with URL and keys wired into .env.local.  A shared server-side Supabase SSR utility in src/lib/supabaseServer.ts.  A health-check route at /api/health that returns JSON and proves SSR auth wiring.  A working layout file confirming Tailwind and App Router are correctly initialized.  If any of these conditions are not true, Day 1 is not complete yet and must be corrected before starting Day 2.