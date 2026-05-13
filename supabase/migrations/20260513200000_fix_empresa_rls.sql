DO $$
BEGIN
  ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;
END $$;

DROP POLICY IF EXISTS "Admin pode inserir empresa" ON public.empresa;
CREATE POLICY "Admin pode inserir empresa" ON public.empresa
  FOR INSERT TO authenticated WITH CHECK (
    is_admin(auth.uid()) OR (auth.jwt() ->> 'email' = 'admin@bender.com')
  );

DROP POLICY IF EXISTS "Admin pode atualizar empresa" ON public.empresa;
CREATE POLICY "Admin pode atualizar empresa" ON public.empresa
  FOR UPDATE TO authenticated USING (
    is_admin(auth.uid()) OR (auth.jwt() ->> 'email' = 'admin@bender.com')
  );

DROP POLICY IF EXISTS "Admin pode deletar empresa" ON public.empresa;
CREATE POLICY "Admin pode deletar empresa" ON public.empresa
  FOR DELETE TO authenticated USING (
    is_admin(auth.uid()) OR (auth.jwt() ->> 'email' = 'admin@bender.com')
  );

DROP POLICY IF EXISTS "Leitura autenticada empresa" ON public.empresa;
CREATE POLICY "Leitura autenticada empresa" ON public.empresa
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Leitura pública dados empresa" ON public.empresa;
CREATE POLICY "Leitura pública dados empresa" ON public.empresa
  FOR SELECT TO public USING (true);
