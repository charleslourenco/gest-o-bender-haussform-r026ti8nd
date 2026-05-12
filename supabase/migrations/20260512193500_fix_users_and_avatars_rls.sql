DO $$
BEGIN
  -- 1. Políticas RLS para a tabela de usuários, garantindo permissão de escrita para administradores
  DROP POLICY IF EXISTS "Admin insere usuários" ON public.users;
  CREATE POLICY "Admin insere usuários" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (public.is_admin(auth.uid()));

  DROP POLICY IF EXISTS "Admin atualiza usuários" ON public.users;
  CREATE POLICY "Admin atualiza usuários" ON public.users
    FOR UPDATE TO authenticated
    USING ((auth.uid() = id) OR public.is_admin(auth.uid()))
    WITH CHECK ((auth.uid() = id) OR public.is_admin(auth.uid()));

  -- 2. Garante que o bucket 'avatars' existe para upload de fotos de perfil (evitando erro de RLS no storage)
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

  -- 3. Políticas RLS para o bucket 'avatars' (storage.objects)
  DROP POLICY IF EXISTS "Permitir upload para avatars" ON storage.objects;
  CREATE POLICY "Permitir upload para avatars" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Permitir update para avatars" ON storage.objects;
  CREATE POLICY "Permitir update para avatars" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars')
    WITH CHECK (bucket_id = 'avatars');

  DROP POLICY IF EXISTS "Permitir leitura para avatars" ON storage.objects;
  CREATE POLICY "Permitir leitura para avatars" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');
    
  DROP POLICY IF EXISTS "Permitir delete para avatars" ON storage.objects;
  CREATE POLICY "Permitir delete para avatars" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars');
END $$;
