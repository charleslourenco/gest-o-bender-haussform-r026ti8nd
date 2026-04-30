-- This migration ensures the exact table structure and RLS policies 
-- requested for the Bender System.

DO $$
BEGIN
  -- Criação de tabelas base
  CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    telefone TEXT,
    funcao TEXT,
    foto_perfil TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.matriz_permissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    modulo TEXT NOT NULL,
    nivel_acesso TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    logo_url TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
END $$;

-- Habilita RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;

-- Função auxiliar de Admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_adm boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.matriz_permissoes
    WHERE usuario_id = user_id AND nivel_acesso = 'Admin'
  ) INTO is_adm;
  RETURN is_adm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar user automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, nome)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    nome = EXCLUDED.nome;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Policies para public.users
DROP POLICY IF EXISTS "Usuário vê apenas seus dados ou admin" ON public.users;
CREATE POLICY "Usuário vê apenas seus dados ou admin" ON public.users
  FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuário insere sua conta" ON public.users;
CREATE POLICY "Usuário insere sua conta" ON public.users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário edita seus dados" ON public.users;
CREATE POLICY "Usuário edita seus dados" ON public.users
  FOR UPDATE TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin deleta" ON public.users;
CREATE POLICY "Admin deleta" ON public.users
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Policies para public.matriz_permissoes
DROP POLICY IF EXISTS "Ver próprias permissões ou admin" ON public.matriz_permissoes;
CREATE POLICY "Ver próprias permissões ou admin" ON public.matriz_permissoes
  FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin gerencia permissões (Insert)" ON public.matriz_permissoes;
CREATE POLICY "Admin gerencia permissões (Insert)" ON public.matriz_permissoes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin gerencia permissões (Update)" ON public.matriz_permissoes;
CREATE POLICY "Admin gerencia permissões (Update)" ON public.matriz_permissoes
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin gerencia permissões (Delete)" ON public.matriz_permissoes;
CREATE POLICY "Admin gerencia permissões (Delete)" ON public.matriz_permissoes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Policies para public.empresa
DROP POLICY IF EXISTS "Leitura pública dados empresa" ON public.empresa;
CREATE POLICY "Leitura pública dados empresa" ON public.empresa
  FOR SELECT TO public USING (true);
  
DROP POLICY IF EXISTS "Leitura autenticada empresa" ON public.empresa;
CREATE POLICY "Leitura autenticada empresa" ON public.empresa
  FOR SELECT TO authenticated USING (true);

-- Seed de Super Admin
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@bender.com') THEN
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
      'admin@bender.com',
      crypt('Bender@2026', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"nome": "Super Admin Bender"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, nome)
    VALUES (new_user_id, 'admin@bender.com', 'Super Admin Bender')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.matriz_permissoes (usuario_id, modulo, nivel_acesso)
    VALUES 
      (new_user_id, 'Usuários', 'Admin'),
      (new_user_id, 'Administrativo', 'Admin'),
      (new_user_id, 'Comercial', 'Admin'),
      (new_user_id, 'Clientes', 'Admin'),
      (new_user_id, 'Financeiro', 'Admin'),
      (new_user_id, 'Dashboard', 'Admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
