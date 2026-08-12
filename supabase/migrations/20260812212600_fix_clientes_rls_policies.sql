-- Ensure RLS policies on clientes allow authenticated users to perform required operations
-- This fixes silent failures when soft-deleting clients (UPDATE excluido = true)

-- SELECT: Allow all authenticated users to read all clients (the app shows all clients in the list)
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT TO authenticated USING (true);

-- INSERT: Allow all authenticated users to create clients
DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
CREATE POLICY "clientes_insert" ON public.clientes
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: Allow all authenticated users to update clients (needed for soft delete - exclido = true)
DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
CREATE POLICY "clientes_update" ON public.clientes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE: Keep restricted to admin only (physical delete)
DROP POLICY IF EXISTS "clientes_delete_admin_only" ON public.clientes;
CREATE POLICY "clientes_delete_admin_only" ON public.clientes
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
