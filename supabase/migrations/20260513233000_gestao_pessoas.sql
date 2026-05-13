CREATE TABLE IF NOT EXISTS public.equipe_clt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  rg TEXT,
  cpf TEXT,
  data_nascimento DATE,
  data_admissao DATE,
  ctps TEXT,
  pis TEXT,
  cnh TEXT,
  cnh_categoria TEXT,
  telefone TEXT,
  email TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  estado TEXT,
  salario_base NUMERIC,
  ferias_adiantadas_dias INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.parceiros_pj (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  cnpj TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  municipio TEXT,
  estado TEXT,
  socio_nome TEXT,
  socio_rg TEXT,
  socio_cpf TEXT,
  socio_data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  ajuda_custo NUMERIC,
  comissoes NUMERIC,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documentos_equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clt_id UUID REFERENCES public.equipe_clt(id) ON DELETE CASCADE,
  pj_id UUID REFERENCES public.parceiros_pj(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  tipo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CHECK (clt_id IS NOT NULL OR pj_id IS NOT NULL)
);

ALTER TABLE public.equipe_clt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parceiros_pj ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_equipe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipe_clt_all" ON public.equipe_clt;
CREATE POLICY "equipe_clt_all" ON public.equipe_clt FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "parceiros_pj_all" ON public.parceiros_pj;
CREATE POLICY "parceiros_pj_all" ON public.parceiros_pj FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "documentos_equipe_all" ON public.documentos_equipe;
CREATE POLICY "documentos_equipe_all" ON public.documentos_equipe FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos_equipe', 'documentos_equipe', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documentos_equipe_storage_all" ON storage.objects;
CREATE POLICY "documentos_equipe_storage_all" ON storage.objects 
  FOR ALL TO authenticated 
  USING (bucket_id = 'documentos_equipe') 
  WITH CHECK (bucket_id = 'documentos_equipe');

DROP POLICY IF EXISTS "documentos_equipe_storage_public_read" ON storage.objects;
CREATE POLICY "documentos_equipe_storage_public_read" ON storage.objects 
  FOR SELECT TO public 
  USING (bucket_id = 'documentos_equipe');
