DO $$
BEGIN
  -- Drop existing policies that might conflict or cause issues
  DROP POLICY IF EXISTS "Acesso total documentos" ON public.documentos_cliente;
  DROP POLICY IF EXISTS "Permitir leitura para usuários autenticados" ON public.documentos_cliente;
  DROP POLICY IF EXISTS "doc_cli_delete" ON public.documentos_cliente;
  DROP POLICY IF EXISTS "doc_cli_insert" ON public.documentos_cliente;
  DROP POLICY IF EXISTS "doc_cli_select" ON public.documentos_cliente;
  DROP POLICY IF EXISTS "doc_cli_update" ON public.documentos_cliente;

  -- Create comprehensive, permissive policies for authenticated users
  CREATE POLICY "documentos_cliente_select" ON public.documentos_cliente
    FOR SELECT TO authenticated USING (true);

  CREATE POLICY "documentos_cliente_insert" ON public.documentos_cliente
    FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "documentos_cliente_update" ON public.documentos_cliente
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  CREATE POLICY "documentos_cliente_delete" ON public.documentos_cliente
    FOR DELETE TO authenticated USING (true);
END $$;
