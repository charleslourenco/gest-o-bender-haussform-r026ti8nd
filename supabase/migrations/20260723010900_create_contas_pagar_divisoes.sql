CREATE TABLE IF NOT EXISTS public.contas_pagar_divisoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_pagar_id UUID NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contas_pagar_divisoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contas_pagar_divisoes_select" ON public.contas_pagar_divisoes;
CREATE POLICY "contas_pagar_divisoes_select" ON public.contas_pagar_divisoes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "contas_pagar_divisoes_insert" ON public.contas_pagar_divisoes;
CREATE POLICY "contas_pagar_divisoes_insert" ON public.contas_pagar_divisoes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contas_pagar_divisoes_update" ON public.contas_pagar_divisoes;
CREATE POLICY "contas_pagar_divisoes_update" ON public.contas_pagar_divisoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contas_pagar_divisoes_delete" ON public.contas_pagar_divisoes;
CREATE POLICY "contas_pagar_divisoes_delete" ON public.contas_pagar_divisoes
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_contas_pagar_divisoes_conta_pagar_id
  ON public.contas_pagar_divisoes(conta_pagar_id);
