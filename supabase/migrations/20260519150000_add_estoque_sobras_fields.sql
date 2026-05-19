ALTER TABLE public.estoque_sobras ADD COLUMN IF NOT EXISTS marca TEXT;
ALTER TABLE public.estoque_sobras ADD COLUMN IF NOT EXISTS cliente_nome TEXT;
ALTER TABLE public.estoque_sobras ADD COLUMN IF NOT EXISTS espessura NUMERIC;

DROP POLICY IF EXISTS "estoque_sobras_public_select" ON public.estoque_sobras;
CREATE POLICY "estoque_sobras_public_select" ON public.estoque_sobras
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "estoque_sobras_public_update" ON public.estoque_sobras;
CREATE POLICY "estoque_sobras_public_update" ON public.estoque_sobras
  FOR UPDATE TO public USING (true) WITH CHECK (true);
