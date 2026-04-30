DO $$
BEGIN
  -- Add new columns to formulario_comercial ensuring referential integrity
  ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE;
  ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS etapa_atual INTEGER DEFAULT 1;
  ALTER TABLE public.formulario_comercial ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
END $$;

-- Ensure RLS on clientes
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
CREATE POLICY "clientes_select" ON public.clientes 
  FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
CREATE POLICY "clientes_insert" ON public.clientes 
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
CREATE POLICY "clientes_update" ON public.clientes 
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;
CREATE POLICY "clientes_delete" ON public.clientes 
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Ensure RLS on formulario_comercial
DROP POLICY IF EXISTS "formulario_comercial_select" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_select" ON public.formulario_comercial 
  FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "formulario_comercial_insert" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_insert" ON public.formulario_comercial 
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "formulario_comercial_update" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_update" ON public.formulario_comercial 
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "formulario_comercial_delete" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_delete" ON public.formulario_comercial 
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));
