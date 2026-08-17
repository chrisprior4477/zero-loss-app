-- Remove the residual TRUNCATE, REFERENCES, TRIGGER and MAINTAIN grants held
-- by the client roles (anon, authenticated) on every table in the public
-- schema, plus the sequence grants that came from the same source.
--
-- Where these came from: Supabase's default privileges for the migration role
-- grant the client roles a fixed set on every new table in public. Reading the
-- ACL directly shows exactly what that set is:
--
--   select defaclacl from pg_default_acl
--    where pg_get_userbyid(defaclrole) = 'postgres'
--      and defaclnamespace = 'public'::regnamespace and defaclobjtype = 'r';
--
--   {postgres=arwdDxtm/postgres, anon=Dxtm/postgres,
--    authenticated=Dxtm/postgres, service_role=Dxtm/postgres}
--
-- The Data API privileges (arwd = INSERT, SELECT, UPDATE, DELETE) are already
-- withheld, which is the "always-revoked" behaviour that supabase/config.toml
-- relies on. What survives is Dxtm: TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.
-- No earlier migration touched them; 20260815160000 and 20260815180000 revoke
-- UPDATE, which is a different privilege bit.
--
-- Why each matters, worst first:
--
--   * TRUNCATE is the serious one. Row-level security constrains rows matched
--     by DML; TRUNCATE does not match rows, it empties the relation, so no
--     policy applies. It also does not require DELETE. The column-level
--     lockdown on customer_profiles was therefore fully intact while the whole
--     table stayed erasable by any client role, and the same held for
--     customers and ledger_entries. Verified against a local stack: both anon
--     and authenticated could TRUNCATE public.customer_profiles.
--
--   * TRIGGER lets a role attach a trigger to a table. The trigger function
--     runs with the privileges of whoever performs the write, so this is a way
--     to make someone else's write execute attacker-chosen code — on a table
--     the attacker may not be able to write to directly.
--
--   * MAINTAIN (new in Postgres 17) permits VACUUM, ANALYZE, REINDEX, CLUSTER
--     and REFRESH MATERIALIZED VIEW. It leaks no data, but it lets a client
--     role take heavy maintenance locks on demand, which is a cheap denial of
--     service. Note that information_schema.table_privileges does not report
--     MAINTAIN at all — has_table_privilege(role, tbl, 'MAINTAIN') is the only
--     way to see it, which is why an audit based on information_schema alone
--     will report these tables as clean when they are not.
--
--   * REFERENCES lets a role create a foreign key pointing at these tables.
--     That is a weak existence oracle (a key value can be probed through FK
--     violation errors) and it obstructs later schema changes.
--
--   * On sequences the same defaults grant UPDATE, which per the Postgres
--     documentation is what setval() and nextval() require. public currently
--     has one sequence, health_check_id_seq, owned by health_check.id: a
--     client role could wind it backwards and cause primary key collisions on
--     subsequent inserts.
--
-- Practical exposure today is limited rather than zero: PostgREST only ever
-- issues SELECT/INSERT/UPDATE/DELETE and RPC calls, so none of these are
-- reachable through the Data API with an anon or user JWT. They become live if
-- anything opens a direct database connection as a client role, or if an RPC
-- is ever written that builds dynamic SQL. This migration closes them because
-- a grant nobody can justify should not be sitting on a KYC table, not because
-- there is a known route to it.
--
-- Objects are named explicitly rather than using ALL TABLES IN SCHEMA public so
-- that the audited set is visible in the migration, and so a table added later
-- has to be considered rather than silently swept in.
--
-- This repairs the objects that exist today. 20260817130000 stops the same
-- privileges being handed out to objects created from now on.
--
-- service_role is deliberately left alone: it holds the same residual set and
-- no DML, which is its own inconsistency, but it is the server-side role and
-- changing it is a separate decision.

revoke truncate, references, trigger, maintain on public.customers          from anon, authenticated;
revoke truncate, references, trigger, maintain on public.customer_profiles  from anon, authenticated;
revoke truncate, references, trigger, maintain on public.catalog_items      from anon, authenticated;
revoke truncate, references, trigger, maintain on public.ledger_entries     from anon, authenticated;
revoke truncate, references, trigger, maintain on public.health_check       from anon, authenticated;

revoke usage, select, update on sequence public.health_check_id_seq from anon, authenticated;
