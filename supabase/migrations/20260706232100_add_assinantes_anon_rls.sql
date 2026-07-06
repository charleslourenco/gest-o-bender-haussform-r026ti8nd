-- Add anon RLS policies for assinantes table (portal access without auth)
DROP POLICY IF EXISTS "assinantes_select_anon" ON public.assinantes;
CREATE POLICY "assinantes_select_anon" ON public.assinantes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "assinantes_update_anon" ON public.assinantes;
CREATE POLICY "assinantes_update_anon" ON public.assinantes
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "assinantes_insert_auth" ON public.assinantes;
CREATE POLICY "assinantes_insert_auth" ON public.assinantes
  FOR INSERT TO authenticated WITH CHECK (true);
