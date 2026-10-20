-- Resolve built-ins through pg_catalog regardless of the caller's search path.
-- Preserve the existing trigger body, invoker permissions, and timestamps.
alter function public.set_updated_at() set search_path = '';
