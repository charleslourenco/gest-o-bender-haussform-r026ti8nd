-- Seed Auth User
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'charleslourenco01@icloud.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'charleslourenco01@icloud.com',
      crypt('Skip@Pass', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Charles Lourenço"}',
      false, 'authenticated', 'authenticated', '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, nome) 
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço') 
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Setup Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('orcamentos-uploads', 'orcamentos-uploads', true) 
ON CONFLICT (id) DO NOTHING;

-- Setup RLS Policies for Storage
DROP POLICY IF EXISTS "orcamentos_uploads_select" ON storage.objects;
CREATE POLICY "orcamentos_uploads_select" ON storage.objects 
  FOR SELECT TO authenticated USING (bucket_id = 'orcamentos-uploads');

DROP POLICY IF EXISTS "orcamentos_uploads_insert" ON storage.objects;
CREATE POLICY "orcamentos_uploads_insert" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'orcamentos-uploads');

-- Ensure permissions for orcamentos and listas_materiais tables
DROP POLICY IF EXISTS "orc_auth_all" ON public.orcamentos;
CREATE POLICY "orc_auth_all" ON public.orcamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "itens_orc_auth_all" ON public.itens_orcamento;
CREATE POLICY "itens_orc_auth_all" ON public.itens_orcamento
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "listas_mat_auth_all" ON public.listas_materiais;
CREATE POLICY "listas_mat_auth_all" ON public.listas_materiais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "itens_listas_mat_auth_all" ON public.itens_lista_material;
CREATE POLICY "itens_listas_mat_auth_all" ON public.itens_lista_material
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
