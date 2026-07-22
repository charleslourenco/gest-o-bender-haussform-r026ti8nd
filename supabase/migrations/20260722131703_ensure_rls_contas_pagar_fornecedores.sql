-- Ensure RLS policies allow authenticated SELECT and INSERT on contas_pagar and fornecedores

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- contas_pagar: SELECT for authenticated (own or null)
DROP POLICY IF EXISTS "contas_pagar_select_authenticated" ON public.contas_pagar;
CREATE POLICY "contas_pagar_select_authenticated" ON public.contas_pagar
  FOR SELECT TO authenticated USING (true);

-- contas_pagar: INSERT for authenticated
DROP POLICY IF EXISTS "contas_pagar_insert_authenticated" ON public.contas_pagar;
CREATE POLICY "contas_pagar_insert_authenticated" ON public.contas_pagar
  FOR INSERT TO authenticated WITH CHECK (true);

-- fornecedores: SELECT for authenticated
DROP POLICY IF EXISTS "fornecedores_select_authenticated" ON public.fornecedores;
CREATE POLICY "fornecedores_select_authenticated" ON public.fornecedores
  FOR SELECT TO authenticated USING (true);

-- fornecedores: INSERT for authenticated
DROP POLICY IF EXISTS "fornecedores_insert_authenticated" ON public.fornecedores;
CREATE POLICY "fornecedores_insert_authenticated" ON public.fornecedores
  FOR INSERT TO authenticated WITH CHECK (true);
