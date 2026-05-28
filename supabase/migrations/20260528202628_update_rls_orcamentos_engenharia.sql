-- Make sure the DELETE policy for authenticated users is present
DROP POLICY IF EXISTS "orcamentos_engenharia_delete_auth" ON public.orcamentos_engenharia;

CREATE POLICY "orcamentos_engenharia_delete_auth" ON public.orcamentos_engenharia
  FOR DELETE TO authenticated USING (true);
