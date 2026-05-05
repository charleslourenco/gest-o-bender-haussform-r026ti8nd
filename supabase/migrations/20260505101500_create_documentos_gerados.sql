DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.documentos_gerados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    path TEXT NOT NULL,
    tipo TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  ALTER TABLE public.documentos_gerados ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "documentos_gerados_select" ON public.documentos_gerados;
  CREATE POLICY "documentos_gerados_select" ON public.documentos_gerados FOR SELECT TO authenticated USING (true);

  DROP POLICY IF EXISTS "documentos_gerados_insert" ON public.documentos_gerados;
  CREATE POLICY "documentos_gerados_insert" ON public.documentos_gerados FOR INSERT TO authenticated WITH CHECK (true);

  DROP POLICY IF EXISTS "documentos_gerados_delete" ON public.documentos_gerados;
  CREATE POLICY "documentos_gerados_delete" ON public.documentos_gerados FOR DELETE TO authenticated USING (true);

  DROP POLICY IF EXISTS "documentos_gerados_update" ON public.documentos_gerados;
  CREATE POLICY "documentos_gerados_update" ON public.documentos_gerados FOR UPDATE TO authenticated USING (true);
END $$;
