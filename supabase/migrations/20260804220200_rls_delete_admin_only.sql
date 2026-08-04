-- Restrict DELETE operations to admin users only (soft delete replaces physical delete)
-- produtos_servicos_projeto
DROP POLICY IF EXISTS "authenticated_delete_produtos_servicos_projeto" ON public.produtos_servicos_projeto;
DROP POLICY IF EXISTS "produtos_servicos_projeto_delete_admin" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_delete_admin_only" ON public.produtos_servicos_projeto
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- clientes
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;
DROP POLICY IF EXISTS "Acesso total clientes" ON public.clientes;
CREATE POLICY "clientes_delete_admin_only" ON public.clientes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- leads
DROP POLICY IF EXISTS "leads_delete_admin_only" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_own" ON public.leads;
CREATE POLICY "leads_delete_admin_only" ON public.leads
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- formulario_comercial: restrict delete to admin
DROP POLICY IF EXISTS "Admin can delete all forms" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_delete_admin_only" ON public.formulario_comercial
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
