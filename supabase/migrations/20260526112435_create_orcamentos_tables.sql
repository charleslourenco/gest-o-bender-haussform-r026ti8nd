-- Drop existing tables to recreate from scratch as per AC
DROP TABLE IF EXISTS public.itens_lista_material CASCADE;
DROP TABLE IF EXISTS public.listas_materiais CASCADE;
DROP TABLE IF EXISTS public.versoes_orcamentos CASCADE;
DROP TABLE IF EXISTS public.itens_orcamento CASCADE;
DROP TABLE IF EXISTS public.orcamentos CASCADE;

CREATE TABLE IF NOT EXISTS public.orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ambiente TEXT,
  descricao TEXT,
  status TEXT DEFAULT 'Rascunho',
  valor_total NUMERIC(12,2) DEFAULT 0,
  indice_preco_vista NUMERIC(5,2) DEFAULT 1.0,
  indice_preco_prazo NUMERIC(5,2) DEFAULT 1.0,
  data_criacao TIMESTAMPTZ DEFAULT now(),
  data_atualizacao TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itens_orcamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  estoque_item_id UUID REFERENCES public.estoque_itens(id) ON DELETE SET NULL,
  quantidade NUMERIC DEFAULT 1,
  preco_custo NUMERIC(12,2) DEFAULT 0,
  preco_venda NUMERIC(12,2) DEFAULT 0,
  data_criacao TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.listas_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ambiente TEXT,
  descricao TEXT,
  status TEXT DEFAULT 'Rascunho',
  data_criacao TIMESTAMPTZ DEFAULT now(),
  data_atualizacao TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.itens_lista_material (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_material_id UUID REFERENCES public.listas_materiais(id) ON DELETE CASCADE,
  estoque_item_id UUID REFERENCES public.estoque_itens(id) ON DELETE SET NULL,
  quantidade NUMERIC DEFAULT 1,
  data_criacao TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.versoes_orcamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  numero_versao INTEGER DEFAULT 1,
  dados_json JSONB,
  criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data_criacao TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_lista_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.versoes_orcamentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orcamentos
DROP POLICY IF EXISTS "orcamentos_select" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_insert" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_update" ON public.orcamentos;
DROP POLICY IF EXISTS "orcamentos_delete" ON public.orcamentos;

CREATE POLICY "orcamentos_select" ON public.orcamentos FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "orcamentos_insert" ON public.orcamentos FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "orcamentos_update" ON public.orcamentos FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "orcamentos_delete" ON public.orcamentos FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for itens_orcamento
DROP POLICY IF EXISTS "itens_orcamento_select" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_insert" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_update" ON public.itens_orcamento;
DROP POLICY IF EXISTS "itens_orcamento_delete" ON public.itens_orcamento;

CREATE POLICY "itens_orcamento_select" ON public.itens_orcamento FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = orcamento_id AND o.user_id = auth.uid())
);
CREATE POLICY "itens_orcamento_insert" ON public.itens_orcamento FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = orcamento_id AND o.user_id = auth.uid())
);
CREATE POLICY "itens_orcamento_update" ON public.itens_orcamento FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = orcamento_id AND o.user_id = auth.uid())
);
CREATE POLICY "itens_orcamento_delete" ON public.itens_orcamento FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orcamentos o WHERE o.id = orcamento_id AND o.user_id = auth.uid())
);

-- RLS Policies for listas_materiais
DROP POLICY IF EXISTS "listas_materiais_select" ON public.listas_materiais;
DROP POLICY IF EXISTS "listas_materiais_insert" ON public.listas_materiais;
DROP POLICY IF EXISTS "listas_materiais_update" ON public.listas_materiais;
DROP POLICY IF EXISTS "listas_materiais_delete" ON public.listas_materiais;

CREATE POLICY "listas_materiais_select" ON public.listas_materiais FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "listas_materiais_insert" ON public.listas_materiais FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "listas_materiais_update" ON public.listas_materiais FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "listas_materiais_delete" ON public.listas_materiais FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS Policies for itens_lista_material
DROP POLICY IF EXISTS "itens_lista_material_select" ON public.itens_lista_material;
DROP POLICY IF EXISTS "itens_lista_material_insert" ON public.itens_lista_material;
DROP POLICY IF EXISTS "itens_lista_material_update" ON public.itens_lista_material;
DROP POLICY IF EXISTS "itens_lista_material_delete" ON public.itens_lista_material;

CREATE POLICY "itens_lista_material_select" ON public.itens_lista_material FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.listas_materiais l WHERE l.id = lista_material_id AND l.user_id = auth.uid())
);
CREATE POLICY "itens_lista_material_insert" ON public.itens_lista_material FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.listas_materiais l WHERE l.id = lista_material_id AND l.user_id = auth.uid())
);
CREATE POLICY "itens_lista_material_update" ON public.itens_lista_material FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.listas_materiais l WHERE l.id = lista_material_id AND l.user_id = auth.uid())
);
CREATE POLICY "itens_lista_material_delete" ON public.itens_lista_material FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.listas_materiais l WHERE l.id = lista_material_id AND l.user_id = auth.uid())
);

-- RLS Policies for versoes_orcamentos
DROP POLICY IF EXISTS "versoes_orcamentos_select" ON public.versoes_orcamentos;
DROP POLICY IF EXISTS "versoes_orcamentos_insert" ON public.versoes_orcamentos;
DROP POLICY IF EXISTS "versoes_orcamentos_update" ON public.versoes_orcamentos;
DROP POLICY IF EXISTS "versoes_orcamentos_delete" ON public.versoes_orcamentos;

CREATE POLICY "versoes_orcamentos_select" ON public.versoes_orcamentos FOR SELECT TO authenticated USING (criado_por = auth.uid());
CREATE POLICY "versoes_orcamentos_insert" ON public.versoes_orcamentos FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid());
CREATE POLICY "versoes_orcamentos_update" ON public.versoes_orcamentos FOR UPDATE TO authenticated USING (criado_por = auth.uid()) WITH CHECK (criado_por = auth.uid());
CREATE POLICY "versoes_orcamentos_delete" ON public.versoes_orcamentos FOR DELETE TO authenticated USING (criado_por = auth.uid());

-- Insert Seed User
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
  END IF;
END $$;
