-- Deploy the compare-and-submit UI before enabling stale legacy-client safety.
begin;
update demo_private.funding_config set entry_recovery_required=true where singleton and environment='development-test' and entry_undo_required;
commit;
