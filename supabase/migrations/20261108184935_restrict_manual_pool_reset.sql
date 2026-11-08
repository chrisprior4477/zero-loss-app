-- A shopper cannot reopen a full pool, even by replaying an old product link.
-- The separate, ownership-checked sample reward restart remains available.
revoke execute on function public.reset_demo_pool(text) from public, anon, authenticated;
