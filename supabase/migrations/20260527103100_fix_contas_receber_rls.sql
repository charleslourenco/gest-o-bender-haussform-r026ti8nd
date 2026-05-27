-- Remover as políticas restritivas antigas que limitavam o acesso apenas ao criador (user_id = auth.uid())
DROP POLICY IF EXISTS "contas_receber_delete" ON public.contas_receber;
DROP POLICY IF EXISTS "contas_receber_insert" ON public.contas_receber;
DROP POLICY IF EXISTS "contas_receber_select" ON public.contas_receber;
DROP POLICY IF EXISTS "contas_receber_update" ON public.contas_receber;

-- Criar políticas permitindo acesso de leitura/escrita para todos os usuários autenticados,
-- alinhando com a regra de negócios para administradores e a tabela contas_pagar
CREATE POLICY "contas_receber_select" ON public.contas_receber
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contas_receber_insert" ON public.contas_receber
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contas_receber_update" ON public.contas_receber
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "contas_receber_delete" ON public.contas_receber
  FOR DELETE TO authenticated USING (true);
