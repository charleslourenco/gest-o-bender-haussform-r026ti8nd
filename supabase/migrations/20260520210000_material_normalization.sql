ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS metadados_normalizados JSONB;
ALTER TABLE public.listas_materiais ADD COLUMN IF NOT EXISTS metadados_normalizados JSONB;

-- Update RLS policies to ensure full access for authenticated users to the new columns
DROP POLICY IF EXISTS "estoque_itens_all" ON public.estoque_itens;
CREATE POLICY "estoque_itens_all" ON public.estoque_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "listas_materiais_all" ON public.listas_materiais;
CREATE POLICY "listas_materiais_all" ON public.listas_materiais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
