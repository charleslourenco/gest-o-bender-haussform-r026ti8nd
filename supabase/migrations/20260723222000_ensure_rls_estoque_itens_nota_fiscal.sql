-- Ensure RLS policies exist on estoque_itens and itens_nota_fiscal for authenticated users
-- Idempotent: uses DROP IF EXISTS before CREATE POLICY

-- estoque_itens: ensure RLS enabled and policies exist
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque_itens_all" ON public.estoque_itens;
CREATE POLICY "estoque_itens_all" ON public.estoque_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- itens_nota_fiscal: ensure RLS enabled and policies exist
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
