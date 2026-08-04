-- FinanceOS — bucket de armazenamento para documentos importados (Módulo 4)
-- Caminho de cada arquivo: {user_id}/{uuid}-{nome-original}
-- Assim, o primeiro segmento da pasta identifica o dono do arquivo para o RLS.

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists "documentos_select_own" on storage.objects;
create policy "documentos_select_own" on storage.objects for select
  using (bucket_id = 'documentos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "documentos_insert_own" on storage.objects;
create policy "documentos_insert_own" on storage.objects for insert
  with check (bucket_id = 'documentos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "documentos_delete_own" on storage.objects;
create policy "documentos_delete_own" on storage.objects for delete
  using (bucket_id = 'documentos' and auth.uid()::text = (storage.foldername(name))[1]);
