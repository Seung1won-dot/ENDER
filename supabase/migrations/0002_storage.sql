-- 비공개 버킷 chest, 경로 첫 폴더 = auth.uid()

insert into storage.buckets (id, name, public, file_size_limit)
values ('chest', 'chest', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "chest owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chest owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chest owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chest owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'chest' and (storage.foldername(name))[1] = auth.uid()::text);
