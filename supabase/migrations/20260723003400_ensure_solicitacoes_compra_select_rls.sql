-- Ensure authenticated users can SELECT solicitacoes_compra (idempotent)
-- Needed so the pending-count badge query in EstoqueCompras returns rows

DROP POLICY IF EXISTS "authenticated_select_solicitacoes" ON public.solicitacoes_compra;
CREATE POLICY "authenticated_select_solicitacoes" ON public.solicitacoes_compra
  FOR SELECT TO authenticated USING (true);
