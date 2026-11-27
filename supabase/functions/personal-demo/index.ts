import { createClient, type Session } from "@supabase/supabase-js";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): void;
};

const url = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
const bridge = Deno.env.get("PERSONAL_DEMO_BRIDGE");
const sessions = new Map<string, Session>();
const reply = (status: number, data: unknown) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function sameSecret(value: string, expected: string) {
  if (value.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= value.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };

// This endpoint is server-to-server. The browser receives only the separate
// opaque device cookie. Every lookup rechecks membership before reusing Auth.
Deno.serve(async (request) => {
  if (
    request.method !== "POST" ||
    url !== "https://ocgdfnvvjvutevgqzzgj.supabase.co" ||
    !serviceKey ||
    !publicKey ||
    !bridge ||
    !sameSecret(request.headers.get("x-demo-bridge") ?? "", bridge)
  )
    return reply(403, {});
  try {
    const { device, action, value, bucket } = await request.json();
    const admin = createClient(url, serviceKey, options);
    const { data, error } = await admin.rpc(action === "session" ? "personal_demo_device" : "personal_demo_live_device", {
      p_device: device,
      p_action: action,
      p_value: value ?? "",
      p_bucket: bucket ?? "",
    });
    if (error)
      return reply(error.code === "P0001" ? 409 : 503, {
        message: error.code === "P0001" ? error.message : "Demo temporarily unavailable.",
      });
    if (action !== "session" || data.missing) return reply(200, data);
    const id: string = data.subject;
    let session = sessions.get(id);
    if (!session || (session.expires_at ?? 0) < Date.now() / 1000 + 120) {
      // Synthetic sample personas exist only in the preview project. No
      // visitor supplies a name, birthday, password or email for this identity.
      const email = "demo-" + id + "@preview.zeroloss.invalid";
      const lookup = await admin.auth.admin.getUserById(id);
      let user = lookup.data.user;
      if (!user && (lookup.error?.status === 404 || lookup.error?.code === "user_not_found")) {
        const created = await admin.auth.admin.createUser({
          id,
          email,
          email_confirm: true,
          app_metadata: { personal_demo: true },
          user_metadata: {
            legal_first_name: "Demo",
            legal_last_name: "Visitor",
            date_of_birth: "1990-01-01",
          },
        });
        user = created.data.user ?? (await admin.auth.admin.getUserById(id)).data.user;
      }
      if (!user || user.id !== id || user.email !== email || user.app_metadata.personal_demo !== true)
        return reply(503, { message: "Your demo is getting ready. Try again." });
      // Generate a one-time sign-in for this reserved sample persona. There
      // is no delivered email and there are no credentials in a sharing URL.
      const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (!link.data.properties) return reply(503, { message: "Demo sign-in is temporarily unavailable." });
      const auth = createClient(url, publicKey, options);
      const verified = await auth.auth.verifyOtp({
        token_hash: link.data.properties.hashed_token,
        type: "magiclink",
      });
      if (verified.data.user?.id !== id || !verified.data.session)
        return reply(503, { message: "Your demo is getting ready. Try again." });
      session = verified.data.session;
      if (sessions.size >= 256) sessions.delete(sessions.keys().next().value!);
      sessions.set(id, session);
    }
    return reply(200, { subject: id, access: session.access_token, refresh: session.refresh_token });
  } catch {
    return reply(503, { message: "Your demo is temporarily unavailable." });
  }
});
