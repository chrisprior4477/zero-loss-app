-- Supabase Storage upserts require SELECT as well as INSERT and UPDATE.
-- Keep that metadata access scoped to the authenticated customer's folder.

drop policy if exists "Customers can read their own profile photo metadata"
  on storage.objects;

create policy "Customers can read their own profile photo metadata"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
