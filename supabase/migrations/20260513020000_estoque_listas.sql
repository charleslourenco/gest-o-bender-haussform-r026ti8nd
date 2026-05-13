DO $$
BEGIN
  ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS fornecedor TEXT;
  ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS terceirizado BOOLEAN DEFAULT false;
END $$;

CREATE TABLE IF NOT EXISTS public.listas_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  arquivo_url TEXT,
  status TEXT DEFAULT 'pendente',
  itens JSONB DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.listas_materiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "listas_materiais_all" ON public.listas_materiais;
CREATE POLICY "listas_materiais_all" ON public.listas_materiais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
