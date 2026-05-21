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
      '{"name": "Admin"}',
      false, 'authenticated', 'authenticated',
      '',    
      '',    
      '',    
      '',    
      '',    
      NULL,  
      '',    
      '',    
      ''     
    );

    INSERT INTO public.users (id, email, nome)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

DROP POLICY IF EXISTS "Acesso total contas_pagar" ON public.contas_pagar;

DROP POLICY IF EXISTS "contas_pagar_select_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_select_own" ON public.contas_pagar
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "contas_pagar_insert_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_insert_own" ON public.contas_pagar
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_pagar_update_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_update_own" ON public.contas_pagar
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_pagar_delete_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_delete_own" ON public.contas_pagar
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_receber_select" ON public.contas_receber;
CREATE POLICY "contas_receber_select" ON public.contas_receber
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "contas_receber_insert" ON public.contas_receber;
CREATE POLICY "contas_receber_insert" ON public.contas_receber
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_receber_update" ON public.contas_receber;
CREATE POLICY "contas_receber_update" ON public.contas_receber
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_receber_delete" ON public.contas_receber;
CREATE POLICY "contas_receber_delete" ON public.contas_receber
  FOR DELETE TO authenticated USING (user_id = auth.uid());
