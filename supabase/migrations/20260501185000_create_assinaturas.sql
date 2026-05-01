CREATE TABLE IF NOT EXISTS public.assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id TEXT NOT NULL,
  documento_nome TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  signatario_tipo TEXT NOT NULL,
  signatario_nome TEXT NOT NULL,
  signatario_cpf TEXT,
  signatario_email TEXT,
  signatario_telefone TEXT,
  codigo_confirmacao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  data_assinatura TIMESTAMPTZ,
  expira_em TIMESTAMPTZ NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.timeline_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  usuario_nome TEXT NOT NULL,
  acao TEXT NOT NULL,
  icone TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Assinaturas All Access" ON public.assinaturas;
CREATE POLICY "Assinaturas All Access" ON public.assinaturas
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.timeline_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Timeline All Access" ON public.timeline_eventos;
CREATE POLICY "Timeline All Access" ON public.timeline_eventos
  FOR ALL USING (true) WITH CHECK (true);
