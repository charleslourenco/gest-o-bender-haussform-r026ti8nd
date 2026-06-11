DO $$
BEGIN
  -- Ensure idempotent RLS policy re-affirmation for produtos_servicos_projeto to support creation of independent cards
  DROP POLICY IF EXISTS "authenticated_insert_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
  CREATE POLICY "authenticated_insert_produtos_servicos_projeto" ON public.produtos_servicos_projeto FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "authenticated_select_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
  CREATE POLICY "authenticated_select_produtos_servicos_projeto" ON public.produtos_servicos_projeto FOR SELECT TO authenticated USING (true);
  
  DROP POLICY IF EXISTS "authenticated_update_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
  CREATE POLICY "authenticated_update_produtos_servicos_projeto" ON public.produtos_servicos_projeto FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "authenticated_delete_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
  CREATE POLICY "authenticated_delete_produtos_servicos_projeto" ON public.produtos_servicos_projeto FOR DELETE TO authenticated USING (true);
END $$;
