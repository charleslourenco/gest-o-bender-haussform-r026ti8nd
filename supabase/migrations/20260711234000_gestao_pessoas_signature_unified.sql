-- Add arquivo_assinado_url and envelope_id to documentos_equipe for signature flow
ALTER TABLE public.documentos_equipe ADD COLUMN IF NOT EXISTS arquivo_assinado_url TEXT;
ALTER TABLE public.documentos_equipe ADD COLUMN IF NOT EXISTS envelope_id UUID REFERENCES public.envelopes_assinatura(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_equipe_envelope_id ON public.documentos_equipe(envelope_id);

-- Ensure RLS policies allow authenticated CRUD on envelopes_assinatura
DROP POLICY IF EXISTS "envelopes_assinatura_select_auth_gestao" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_select_auth_gestao" ON public.envelopes_assinatura
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "envelopes_assinatura_insert_auth_gestao" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_insert_auth_gestao" ON public.envelopes_assinatura
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "envelopes_assinatura_update_auth_gestao" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_update_auth_gestao" ON public.envelopes_assinatura
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "envelopes_assinatura_delete_auth_gestao" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_delete_auth_gestao" ON public.envelopes_assinatura
  FOR DELETE TO authenticated USING (true);

-- Ensure RLS policies allow authenticated CRUD on assinantes
DROP POLICY IF EXISTS "assinantes_select_auth_gestao" ON public.assinantes;
CREATE POLICY "assinantes_select_auth_gestao" ON public.assinantes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "assinantes_insert_auth_gestao" ON public.assinantes;
CREATE POLICY "assinantes_insert_auth_gestao" ON public.assinantes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "assinantes_update_auth_gestao" ON public.assinantes;
CREATE POLICY "assinantes_update_auth_gestao" ON public.assinantes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "assinantes_delete_auth_gestao" ON public.assinantes;
CREATE POLICY "assinantes_delete_auth_gestao" ON public.assinantes
  FOR DELETE TO authenticated USING (true);

-- Ensure RLS policies allow authenticated CRUD on assinaturas
DROP POLICY IF EXISTS "assinaturas_all_auth_gestao" ON public.assinaturas;
CREATE POLICY "assinaturas_all_auth_gestao" ON public.assinaturas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Ensure initial seed user exists (idempotent)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'charleslourenco01@icloud.com';
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
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
  END IF;
END $$;
