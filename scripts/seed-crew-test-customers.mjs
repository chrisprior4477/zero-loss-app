// Owner-approved reusable Crew fixtures. No email/SMS APIs, funds, or entries.
// Server/operator use only: node scripts/seed-crew-test-customers.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const projectRef = "ocgdfnvvjvutevgqzzgj";
const fixtureTag = "crew-test-customers-v1";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(supabaseUrl).hostname, `${projectRef}.supabase.co`, "Unexpected project; stopping.");
const fixtures = Array.from({ length: 5 }, (_, offset) => {
  const number = offset + 1;
  return { number, name: `Test Customer ${number}`, email: `testcustomer${number}@example.test`, phone: String(number).repeat(10) };
});
const quote = value => `'${String(value).replaceAll("'", "''")}'`;

async function management(path, body) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert(response.ok, `Management request failed (${response.status}); response omitted.`);
  return response.json();
}
const query = sql => management("/database/query", { query: sql });
const config = await query("select environment, preview_provisioning_enabled from demo_private.funding_config where singleton");
assert.equal(config[0]?.environment, "development-test", "Fixtures are restricted to the demo environment.");
assert.equal(config[0]?.preview_provisioning_enabled, true, "Canonical demo provisioning must be enabled.");
const existing = await query(`select id,email,raw_app_meta_data->>'zero_loss_test_fixture' as fixture from auth.users where lower(email) in (${fixtures.map(row => quote(row.email)).join(",")})`);
assert(existing.every(row => row.fixture === fixtureTag), "A requested address belongs to a different account; no replacement allowed.");
const keys = await management("/api-keys");
const serviceKey = keys.find(key => key.name === "service_role")?.api_key;
assert(serviceKey, "Server-only fixture provisioning credential unavailable.");
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

for (const fixture of fixtures) {
  let account = existing.find(row => row.email.toLowerCase() === fixture.email);
  if (!account) {
    const { data, error } = await admin.auth.admin.createUser({
      email: fixture.email,
      password: `Fixture!${randomBytes(32).toString("base64url")}a9`,
      email_confirm: true,
      app_metadata: { zero_loss_test_fixture: fixtureTag, demo_customer_number: fixture.number },
      user_metadata: { legal_first_name: "Test", legal_last_name: `Customer ${fixture.number}`, date_of_birth: "1990-01-01", terms_accepted_at: new Date().toISOString() },
    });
    assert(!error && data.user, `Could not create ${fixture.name}: ${error?.code ?? "unknown"}`);
    account = data.user;
    console.log(`Created ${fixture.name}`);
  } else console.log(`Reused ${fixture.name}`);
  fixture.id = account.id;
  assert(/^[0-9a-f-]{36}$/i.test(fixture.id));
  await query(`select demo_private.ensure_preview_customer_for(${quote(fixture.id)}::uuid)`);
}

// Update only the five marked fixtures. No real user's discovery/privacy changes.
await query(`begin;
do $$ begin
  if not exists(select 1 from demo_private.funding_config where singleton and environment='development-test' and preview_provisioning_enabled) then raise exception 'Wrong fixture environment'; end if;
end $$;
${fixtures.map(fixture => `update public.customer_profiles p set display_name=${quote(fixture.name)},phone_number=${quote(fixture.phone)},crew_discoverable=true,crew_find_real_name=true,crew_find_email=true,crew_find_phone=true
where p.customer_id=${quote(fixture.id)}::uuid and exists(select 1 from auth.users u where u.id=p.customer_id and u.email=${quote(fixture.email)} and u.raw_app_meta_data->>'zero_loss_test_fixture'=${quote(fixtureTag)});`).join("\n")}
commit;`);

// Verify normal authenticated discovery and connection/group APIs, then roll
// the test operations back. No test connections or groups remain in accounts.
const discoveryChecks = fixtures.flatMap((fixture, index) => {
  const actor = fixtures[index === 0 ? 1 : 0];
  return [fixture.name, fixture.phone, fixture.email].map(value => `
select set_config('request.jwt.claim.sub',${quote(actor.id)},true);
do $$ begin
  if not exists(select 1 from public.search_crew_people(${quote(value)}) where member_id=${quote(fixture.id)}::uuid) then raise exception 'Fixture lookup failed'; end if;
end $$;`);
}).join("\n");
const groupId = randomUUID();
await query(`begin;
set local role authenticated;
${discoveryChecks}
select set_config('request.jwt.claim.sub',${quote(fixtures[0].id)},true);
select public.request_crew_invitation_by_id(${quote(fixtures[1].id)}::uuid);
select public.request_crew_invitation_by_phone(${quote(fixtures[2].phone)});
select public.request_crew_invitation(${quote(fixtures[3].email)});
do $$ begin
  if (select count(*) from public.get_crew_member_profiles() where member_id in (${fixtures.slice(1, 4).map(row => `${quote(row.id)}::uuid`).join(",")}))<>3 then raise exception 'Fixture connections failed'; end if;
end $$;
select public.save_crew_visibility_group(${quote(JSON.stringify({ id: groupId, name: "Fixture verification", memberIds: fixtures.slice(1, 4).map(row => row.id), contacts: [] }))}::jsonb,false);
rollback;`);
const verified = await query(`select p.display_name as name,p.phone_number as phone,u.email,c.status,
  u.email_confirmed_at is not null as email_confirmed,
  p.crew_discoverable and p.crew_find_real_name and p.crew_find_email and p.crew_find_phone as searchable,
  (select count(*) from public.ledger_entries l where l.customer_id=u.id) as ledger_rows,
  (select count(*) from public.wallet_accounts w where w.customer_id=u.id and w.scope='production') as production_wallets
from auth.users u join public.customers c on c.id=u.id join public.customer_profiles p on p.customer_id=u.id
where u.raw_app_meta_data->>'zero_loss_test_fixture'=${quote(fixtureTag)} order by p.display_name`);
assert.equal(verified.length, 5);
assert(verified.every(row => row.status === "active" && row.email_confirmed && row.searchable && Number(row.production_wallets) === 0));
console.log(JSON.stringify({ customers: verified, verifiedNamePhoneEmailLookups: 15, verifiedConnectionMethods: 3, groupSaveVerified: true, verificationChangesRolledBack: true }, null, 2));
