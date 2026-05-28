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
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'charleslourenco01@icloud.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Charles Lourenço"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.users (id, email, nome)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Ensure RLS on orcamentos_engenharia
DROP POLICY IF EXISTS "orcamentos_engenharia_all" ON public.orcamentos_engenharia;
CREATE POLICY "orcamentos_engenharia_all" ON public.orcamentos_engenharia FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orcamentos_ambientes_all" ON public.orcamentos_ambientes;
CREATE POLICY "orcamentos_ambientes_all" ON public.orcamentos_ambientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "orcamentos_itens_all" ON public.orcamentos_itens;
CREATE POLICY "orcamentos_itens_all" ON public.orcamentos_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drop legacy tables
DROP TABLE IF EXISTS public.itens_orcamento CASCADE;
DROP TABLE IF EXISTS public.itens_lista_material CASCADE;
DROP TABLE IF EXISTS public.listas_materiais CASCADE;
DROP TABLE IF EXISTS public.versoes_orcamentos CASCADE;
DROP TABLE IF EXISTS public.orcamentos CASCADE;
