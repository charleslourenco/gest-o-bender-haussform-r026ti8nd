-- Ensure notificacoes RLS is fully permissive for own actions
DROP POLICY IF EXISTS "Enable read access for own notifications" ON public.notificacoes;
CREATE POLICY "Enable read access for own notifications" ON public.notificacoes
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Enable update for own notifications" ON public.notificacoes;
CREATE POLICY "Enable update for own notifications" ON public.notificacoes
  FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Enable insert for system or admins" ON public.notificacoes;
CREATE POLICY "Enable insert for system or admins" ON public.notificacoes
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for own notifications" ON public.notificacoes;
CREATE POLICY "Enable delete for own notifications" ON public.notificacoes
  FOR DELETE TO authenticated USING (usuario_id = auth.uid());
