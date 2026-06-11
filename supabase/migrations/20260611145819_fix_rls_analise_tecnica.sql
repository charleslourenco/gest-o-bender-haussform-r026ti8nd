DROP POLICY IF EXISTS "authenticated_update_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
CREATE POLICY "authenticated_update_produtos_servicos_projeto" ON public.produtos_servicos_projeto
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
CREATE POLICY "authenticated_select_produtos_servicos_projeto" ON public.produtos_servicos_projeto
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
CREATE POLICY "authenticated_insert_produtos_servicos_projeto" ON public.produtos_servicos_projeto
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_select_users" ON public.users;
CREATE POLICY "authenticated_select_users" ON public.users
  FOR SELECT TO authenticated USING (true);
