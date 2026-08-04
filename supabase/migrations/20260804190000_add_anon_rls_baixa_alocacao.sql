-- Add anonymous RLS policies for public baixa-alocacao page
-- The /baixa-alocacao/:id page must be accessible without login

-- estoque_alocacoes: allow anon to SELECT (load allocation) and UPDATE (mark as baixado)
DROP POLICY IF EXISTS "estoque_alocacoes_anon_select" ON public.estoque_alocacoes;
CREATE POLICY "estoque_alocacoes_anon_select" ON public.estoque_alocacoes
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "estoque_alocacoes_anon_update" ON public.estoque_alocacoes;
CREATE POLICY "estoque_alocacoes_anon_update" ON public.estoque_alocacoes
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- estoque_itens: allow anon to SELECT (join for item details) and UPDATE (deduct quantity on baixa)
DROP POLICY IF EXISTS "estoque_itens_anon_select" ON public.estoque_itens;
CREATE POLICY "estoque_itens_anon_select" ON public.estoque_itens
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "estoque_itens_anon_update" ON public.estoque_itens;
CREATE POLICY "estoque_itens_anon_update" ON public.estoque_itens
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- estoque_movimentacoes: allow anon to INSERT (register saída movement on baixa)
DROP POLICY IF EXISTS "estoque_movimentacoes_anon_insert" ON public.estoque_movimentacoes;
CREATE POLICY "estoque_movimentacoes_anon_insert" ON public.estoque_movimentacoes
  FOR INSERT TO anon WITH CHECK (true);
