-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "produtos_servicos_projeto_insert" ON public.produtos_servicos_projeto;
DROP POLICY IF EXISTS "produtos_servicos_projeto_update" ON public.produtos_servicos_projeto;
DROP POLICY IF EXISTS "produtos_servicos_projeto_select_analise" ON public.produtos_servicos_projeto;
DROP POLICY IF EXISTS "produtos_servicos_projeto_update_analise" ON public.produtos_servicos_projeto;

-- Insert policy: allows insert if related to a valid form, or if the user has access to Analise Tecnica, Producao, or Montagem, or is Admin
CREATE POLICY "produtos_servicos_projeto_insert" ON public.produtos_servicos_projeto
  FOR INSERT TO authenticated
  WITH CHECK (
    (formulario_comercial_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = produtos_servicos_projeto.formulario_comercial_id AND f.user_id = auth.uid()))
    OR public.has_module_access(auth.uid(), 'Análise Técnica')
    OR public.has_module_access(auth.uid(), 'Produção')
    OR public.has_module_access(auth.uid(), 'Montagem')
    OR public.is_admin(auth.uid())
  );

-- Update policy: allows update if related to a valid form, or if the user has access to Analise Tecnica, Producao, or Montagem, or is Admin
CREATE POLICY "produtos_servicos_projeto_update" ON public.produtos_servicos_projeto
  FOR UPDATE TO authenticated
  USING (
    (formulario_comercial_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = produtos_servicos_projeto.formulario_comercial_id AND f.user_id = auth.uid()))
    OR public.has_module_access(auth.uid(), 'Análise Técnica')
    OR public.has_module_access(auth.uid(), 'Produção')
    OR public.has_module_access(auth.uid(), 'Montagem')
    OR public.is_admin(auth.uid())
  );

-- Select policy (Analise context): allows select if user has access to the modules
CREATE POLICY "produtos_servicos_projeto_select_analise" ON public.produtos_servicos_projeto
  FOR SELECT TO authenticated
  USING (
    public.has_module_access(auth.uid(), 'Análise Técnica')
    OR public.has_module_access(auth.uid(), 'Produção')
    OR public.has_module_access(auth.uid(), 'Montagem')
    OR public.is_admin(auth.uid())
  );
