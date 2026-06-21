CREATE TABLE IF NOT EXISTS public.estoque_alocacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
    cliente_nome TEXT NOT NULL,
    quantidade INTEGER NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP POLICY IF EXISTS "estoque_alocacoes_all" ON public.estoque_alocacoes;
CREATE POLICY "estoque_alocacoes_all" ON public.estoque_alocacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.estoque_alocacoes ENABLE ROW LEVEL SECURITY;
