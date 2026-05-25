DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed user charleslourenco01@icloud.com for Admin operations and access
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
      '{"nome": "Charles Lourenço"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, nome, status)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço', true)
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
    VALUES 
      (new_user_id, 'Orçamentos', 'Admin'),
      (new_user_id, 'Dashboard', 'Admin'),
      (new_user_id, 'Administrativo', 'Admin'),
      (new_user_id, 'Comercial', 'Admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Fix RLS for contas_pagar to allow robust access for authenticated users fetching dashboard data
DROP POLICY IF EXISTS "contas_pagar_select_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_select_own" ON public.contas_pagar
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR user_id IS NULL OR is_admin(auth.uid()) OR (auth.jwt() ->> 'email'::text) = 'charleslourenco01@icloud.com'::text
  );
