DO $$
BEGIN
  ALTER TABLE public.solicitacoes_compra 
    ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS data_entrega_prevista DATE,
    ADD COLUMN IF NOT EXISTS fornecedor TEXT;
END $$;

DROP POLICY IF EXISTS "authenticated_select_solicitacoes" ON public.solicitacoes_compra;
CREATE POLICY "authenticated_select_solicitacoes" ON public.solicitacoes_compra
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_solicitacoes" ON public.solicitacoes_compra;
CREATE POLICY "authenticated_insert_solicitacoes" ON public.solicitacoes_compra
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_solicitacoes" ON public.solicitacoes_compra;
CREATE POLICY "authenticated_update_solicitacoes" ON public.solicitacoes_compra
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_solicitacoes" ON public.solicitacoes_compra;
CREATE POLICY "authenticated_delete_solicitacoes" ON public.solicitacoes_compra
  FOR DELETE TO authenticated USING (true);

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
      '{"name": "Charles Lourenco"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
    
    INSERT INTO public.users (id, email, nome, status)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenco', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
