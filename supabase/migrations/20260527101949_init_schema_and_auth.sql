-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Safely create initial tables to satisfy schema dependencies
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  telefone TEXT,
  funcao TEXT,
  foto_perfil TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  origem TEXT NOT NULL,
  consultor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Novo Lead',
  notas TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  criado_por_nome TEXT,
  kanban_ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_venda TIMESTAMPTZ,
  categoria TEXT NOT NULL DEFAULT 'Comercial',
  notas_pessoais TEXT
);

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Ativo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cpf TEXT UNIQUE,
  endereco_obra TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  tipo_imovel TEXT,
  metragem_total NUMERIC,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_nascimento DATE,
  profissao TEXT,
  renda NUMERIC,
  referencia_bancaria TEXT
);

CREATE TABLE IF NOT EXISTS public.formulario_comercial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
  cpf TEXT,
  data_nascimento DATE,
  profissao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  etapa_atual INTEGER DEFAULT 1,
  estado_civil TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  municipio TEXT,
  estado TEXT,
  complemento TEXT,
  obra_cep TEXT,
  obra_municipio TEXT,
  obra_estado TEXT,
  obra_rua TEXT,
  obra_numero TEXT,
  obra_bairro TEXT,
  obra_complemento TEXT,
  produtos_servicos JSONB DEFAULT '[]'::jsonb,
  desconto NUMERIC DEFAULT 0,
  pagamentos JSONB DEFAULT '[]'::jsonb,
  datas JSONB DEFAULT '{}'::jsonb,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  valor_total NUMERIC,
  data_prevista_entrega DATE,
  parcelas JSONB DEFAULT '[]'::jsonb,
  metodo_pagamento TEXT,
  data_pagamento DATE,
  nome_cliente TEXT,
  ambientes JSONB DEFAULT '[]'::jsonb,
  itens JSONB DEFAULT '[]'::jsonb,
  especificacoes TEXT
);

CREATE TABLE IF NOT EXISTS public.produtos_servicos_projeto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_comercial_id UUID REFERENCES public.formulario_comercial(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_produto TEXT NOT NULL,
  qtd INTEGER NOT NULL,
  descricao TEXT,
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  status_analise TEXT NOT NULL DEFAULT 'iniciar',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analista_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  codigo_rastreio TEXT
);

CREATE TABLE IF NOT EXISTS public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fornecedor TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status_pagamento TEXT NOT NULL DEFAULT 'aguardando',
  codigo_barras TEXT,
  comprovante_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meio_pagamento TEXT,
  antecipado BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.matriz_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL,
  nivel_acesso TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS setup for contas_pagar (as required)
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contas_pagar_select_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_select_own" ON public.contas_pagar
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "contas_pagar_insert_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_insert_own" ON public.contas_pagar
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "contas_pagar_update_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_update_own" ON public.contas_pagar
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "contas_pagar_delete_own" ON public.contas_pagar;
CREATE POLICY "contas_pagar_delete_own" ON public.contas_pagar
  FOR DELETE TO authenticated USING (true);

-- Ensure profiles handle function uses $$ for dollar quoting
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

-- Seed initial auth user
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
      (new_user_id, 'Financeiro', 'Admin'),
      (new_user_id, 'Comercial', 'Admin'),
      (new_user_id, 'Produção', 'Admin')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
