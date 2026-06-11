-- Add status_analise_projeto to formulario_comercial
ALTER TABLE IF EXISTS public.formulario_comercial ADD COLUMN IF NOT EXISTS status_analise_projeto text DEFAULT 'iniciar';

DO $$
BEGIN
  -- Grant access to Análise Técnica users for formulario_comercial
  DROP POLICY IF EXISTS "analise_tecnica_select_formulario" ON public.formulario_comercial;
  CREATE POLICY "analise_tecnica_select_formulario" ON public.formulario_comercial
    FOR SELECT TO authenticated USING (
      has_module_access(auth.uid(), 'Análise Técnica')
    );

  DROP POLICY IF EXISTS "analise_tecnica_update_formulario" ON public.formulario_comercial;
  CREATE POLICY "analise_tecnica_update_formulario" ON public.formulario_comercial
    FOR UPDATE TO authenticated USING (
      has_module_access(auth.uid(), 'Análise Técnica')
    ) WITH CHECK (
      has_module_access(auth.uid(), 'Análise Técnica')
    );
    
  -- Grant access to Análise Técnica users for produtos_servicos_projeto
  DROP POLICY IF EXISTS "analise_tecnica_select_psp" ON public.produtos_servicos_projeto;
  CREATE POLICY "analise_tecnica_select_psp" ON public.produtos_servicos_projeto
    FOR SELECT TO authenticated USING (
      has_module_access(auth.uid(), 'Análise Técnica')
    );

  DROP POLICY IF EXISTS "analise_tecnica_update_psp" ON public.produtos_servicos_projeto;
  CREATE POLICY "analise_tecnica_update_psp" ON public.produtos_servicos_projeto
    FOR UPDATE TO authenticated USING (
      has_module_access(auth.uid(), 'Análise Técnica')
    ) WITH CHECK (
      has_module_access(auth.uid(), 'Análise Técnica')
    );
END $$;
