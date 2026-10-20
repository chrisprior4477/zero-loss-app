begin;
create extension if not exists pgtap;
select plan(2);

-- A caller-controlled schema must not replace the trigger's built-in now().
create schema timestamp_shadow_test;
create function timestamp_shadow_test.now() returns timestamptz
language sql as $$ select '2000-01-01'::timestamptz $$;
create temporary table timestamp_trigger_fixture (
  id integer primary key,
  updated_at timestamptz
);
create trigger timestamp_fixture_update before update on timestamp_trigger_fixture
for each row execute function public.set_updated_at();
insert into timestamp_trigger_fixture values (1, '2000-01-01');
set local search_path = timestamp_shadow_test, public, extensions, pg_catalog;
update timestamp_trigger_fixture set id = 1;
select is(
  (select updated_at from timestamp_trigger_fixture),
  pg_catalog.transaction_timestamp(),
  'Timestamp trigger uses the real built-in clock with a hostile caller search path'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.set_updated_at()'::regprocedure),
  'Timestamp trigger retains invoker permissions'
);
select * from finish();
rollback;
