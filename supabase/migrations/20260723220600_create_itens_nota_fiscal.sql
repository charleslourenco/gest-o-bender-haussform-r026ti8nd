-- Migration: Create itens_nota_fiscal table for manual item addition during OCR review

CREATE TABLE IF NOT EXISTS public.itens_nota_fiscal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.estoque_itens(id) ON DELETE SET NULL,
  nome_produto TEXT NOT NULL,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'UN',
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itens_nota_fiscal_nota_id ON public.itens_nota_fiscal(nota_fiscal_id);

ALTER TABLE public.itens_nota_fiscal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itens_nota_fiscal_select" ON public.itens_nota_fiscal;
CREATE POLICY "itens_nota_fiscal_select" ON public.itens_nota_fiscal
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "itens_nota_fiscal_insert" ON public.itens_nota_fiscal;
CREATE POLICY "itens_nota_fiscal_insert" ON public.itens_nota_fiscal
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "itens_nota_fiscal_update" ON public.itens_nota_fiscal;
CREATE POLICY "itens_nota_fiscal_update" ON public.itens_nota_fiscal
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "itens_nota_fiscal_delete" ON public.itens_nota_fiscal;
CREATE POLICY "itens_nota_fiscal_delete" ON public.itens_nota_fiscal
  FOR DELETE TO authenticated USING (true);
