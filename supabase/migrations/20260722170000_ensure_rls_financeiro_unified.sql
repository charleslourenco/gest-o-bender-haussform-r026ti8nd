-- Ensure RLS policies allow authenticated SELECT on parceiros_pj and equipe_clt
-- (needed for unified payee selector) and INSERT on fornecedores and contas_pagar

ALTER TABLE public.parceiros_pj ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe_clt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- parceiros_pj: SELECT for authenticated
DROP POLICY IF EXISTS "parceiros_pj_select_authenticated" ON public.parceiros_pj;
CREATE POLICY "parceiros_pj_select_authenticated" ON public.parceiros_pj
  FOR SELECT TO authenticated USING (true);

-- equipe_clt: SELECT for authenticated
DROP POLICY IF EXISTS "equipe_clt_select_authenticated" ON public.equipe_clt;
CREATE POLICY "equipe_clt_select_authenticated" ON public.equipe_clt
  FOR SELECT TO authenticated USING (true);

-- fornecedores: SELECT for authenticated
DROP POLICY IF EXISTS "fornecedores_select_authenticated" ON public.fornecedores;
CREATE POLICY "fornecedores_select_authenticated" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);

-- fornecedores: INSERT for authenticated
DROP POLICY IF EXISTS "fornecedores_insert_authenticated" ON public.fornecedores;
CREATE POLICY "fornecedores_insert_authenticated" ON public.fornecedores
  FOR INSERT TO authenticated WITH CHECK (true);

-- contas_pagar: SELECT for authenticated
DROP POLICY IF EXISTS "contas_pagar_select_authenticated" ON public.contas_pagar;
CREATE POLICY "contas_pagar_select_authenticated" ON public.contas_pagar
  FOR SELECT TO authenticated USING (true);

-- contas_pagar: INSERT for authenticated
DROP POLICY IF EXISTS "contas_pagar_insert_authenticated" ON public.contas_pagar;
CREATE POLICY "contas_pagar_insert_authenticated" ON public.contas_pagar
  FOR INSERT TO authenticated WITH CHECK (true);
