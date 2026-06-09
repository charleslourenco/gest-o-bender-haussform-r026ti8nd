DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed user
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
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, nome)
    VALUES (new_user_id, 'charleslourenco01@icloud.com', 'Charles Lourenço')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create table
CREATE TABLE IF NOT EXISTS public.modelos_arquivos_estaticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.modelos_arquivos_estaticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "modelos_arquivos_estaticos_all" ON public.modelos_arquivos_estaticos;
CREATE POLICY "modelos_arquivos_estaticos_all" ON public.modelos_arquivos_estaticos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('modelos_globais', 'modelos_globais', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket policies
DROP POLICY IF EXISTS "modelos_globais_public_read" ON storage.objects;
CREATE POLICY "modelos_globais_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'modelos_globais');

DROP POLICY IF EXISTS "modelos_globais_insert" ON storage.objects;
CREATE POLICY "modelos_globais_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'modelos_globais');

DROP POLICY IF EXISTS "modelos_globais_update" ON storage.objects;
CREATE POLICY "modelos_globais_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'modelos_globais');

DROP POLICY IF EXISTS "modelos_globais_delete" ON storage.objects;
CREATE POLICY "modelos_globais_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'modelos_globais');
