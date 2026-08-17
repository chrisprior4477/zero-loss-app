-- Stop handing TRUNCATE, REFERENCES, TRIGGER and MAINTAIN to the client roles
-- on every table created from now on.
--
-- 20260817120000 revoked those privileges from the five tables that existed at
-- the time, but that is a one-off repair. The privileges did not come from any
-- migration in this repo — they come from the default privileges attached to
-- the role that runs migrations:
--
--   for role postgres, in schema public, on tables:
--     {postgres=arwdDxtm/postgres, anon=Dxtm/postgres,
--      authenticated=Dxtm/postgres, service_role=Dxtm/postgres}
--
-- Default privileges are applied by Postgres at CREATE time, so without this
-- migration the next `create table` in public silently re-opens exactly the
-- gap that 20260817120000 closed, and the audit has to be repeated. The
-- regression test in supabase/tests would catch it, but catching it after the
-- fact is worse than not granting it.
--
-- Scope, and what this deliberately does not do:
--
--   * FOR ROLE postgres only. Default privileges are per-granting-role, and
--     postgres is the role that applies these migrations, so it is the one
--     that matters for anything this repo creates. supabase_admin has its own,
--     broader default ACL on public (it grants the full arwdDxtm set to the
--     client roles). That is Supabase-managed: altering it is unsupported, it
--     is not what creates our tables, and doing so risks breaking the platform's
--     own provisioning. Left as-is on purpose.
--
--   * anon and authenticated only. service_role keeps its defaults, matching
--     the scope decision made in 20260817120000.
--
--   * Existing objects are unaffected by ALTER DEFAULT PRIVILEGES — it applies
--     only to objects created afterwards. 20260817120000 is what fixes the
--     current tables, and both migrations are needed.
--
-- Net effect for a table created after this point: the client roles get
-- nothing at all by default, and any access they should have must be granted
-- explicitly by the migration that creates the table. That is the same
-- default-deny direction argued for in 20260815170000, applied one level up.

alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;
