-- Identity lifecycle on public.customers is server/trigger-owned.
-- Authenticated clients must not UPDATE this table (including status,
-- verification_status, security_status, customer_id, terms_accepted_at,
-- closed_at, anonymized_at).
-- handle_email_confirmed remains SECURITY DEFINER and still bypasses RLS.

drop policy if exists "Customers can update own record" on public.customers;

revoke update on public.customers from authenticated;
