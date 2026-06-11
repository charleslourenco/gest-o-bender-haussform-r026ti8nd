DO $$
BEGIN
  -- Create policy to allow delete for admins or the owner
  DROP POLICY IF EXISTS "Allow delete for admins or owners" ON public.formulario_comercial;
  
  CREATE POLICY "Allow delete for admins or owners" ON public.formulario_comercial
    FOR DELETE
    TO authenticated
    USING (
      auth.uid()::text = user_id::text OR public.is_admin(auth.uid())
    );

  -- Ensure cascade delete for produtos_servicos_projeto when a formulario_comercial is deleted
  ALTER TABLE public.produtos_servicos_projeto
    DROP CONSTRAINT IF EXISTS produtos_servicos_projeto_formulario_comercial_id_fkey;
    
  ALTER TABLE public.produtos_servicos_projeto
    ADD CONSTRAINT produtos_servicos_projeto_formulario_comercial_id_fkey
    FOREIGN KEY (formulario_comercial_id)
    REFERENCES public.formulario_comercial(id)
    ON DELETE CASCADE;

  -- Ensure cascade delete for contas_receber
  ALTER TABLE public.contas_receber
    DROP CONSTRAINT IF EXISTS contas_receber_formulario_comercial_id_fkey;

  ALTER TABLE public.contas_receber
    ADD CONSTRAINT contas_receber_formulario_comercial_id_fkey
    FOREIGN KEY (formulario_comercial_id)
    REFERENCES public.formulario_comercial(id)
    ON DELETE CASCADE;

  -- Ensure cascade delete for pagamentos
  ALTER TABLE public.pagamentos
    DROP CONSTRAINT IF EXISTS pagamentos_formulario_id_fkey;

  ALTER TABLE public.pagamentos
    ADD CONSTRAINT pagamentos_formulario_id_fkey
    FOREIGN KEY (formulario_id)
    REFERENCES public.formulario_comercial(id)
    ON DELETE CASCADE;

  -- Ensure cascade delete for dossies
  ALTER TABLE public.dossies
    DROP CONSTRAINT IF EXISTS dossies_formulario_comercial_id_fkey;

  ALTER TABLE public.dossies
    ADD CONSTRAINT dossies_formulario_comercial_id_fkey
    FOREIGN KEY (formulario_comercial_id)
    REFERENCES public.formulario_comercial(id)
    ON DELETE CASCADE;
END $$;
