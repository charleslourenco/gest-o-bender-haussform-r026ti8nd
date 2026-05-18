DO $$
BEGIN
  DROP POLICY IF EXISTS "produtos_servicos_projeto_delete_admin" ON public.produtos_servicos_projeto;
  CREATE POLICY "produtos_servicos_projeto_delete_admin" ON public.produtos_servicos_projeto
    FOR DELETE TO authenticated
    USING (
      is_admin(auth.uid()) 
      OR has_module_access(auth.uid(), 'Análise Técnica') 
      OR has_module_access(auth.uid(), 'Produção') 
      OR has_module_access(auth.uid(), 'Montagem')
      OR formulario_comercial_id IS NULL
    );
END $$;
