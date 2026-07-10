-- Add GIN index on estoque_itens.metadados_normalizados for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_estoque_itens_metadados_normalizados_gin
  ON public.estoque_itens USING GIN (metadados_normalizados jsonb_path_ops);

-- Add index on estoque_itens.marca and cor for attribute-based matching queries
CREATE INDEX IF NOT EXISTS idx_estoque_itens_marca
  ON public.estoque_itens(marca) WHERE marca IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_itens_cor
  ON public.estoque_itens(cor) WHERE cor IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_itens_espessura_mm
  ON public.estoque_itens(espessura_mm) WHERE espessura_mm IS NOT NULL;

-- Ensure RLS policies for estoque_item_aliases allow authenticated users to manage associations
-- (already created in 20260702154857, re-asserting here for safety/idempotency)
ALTER TABLE public.estoque_item_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aliases_select" ON public.estoque_item_aliases;
CREATE POLICY "aliases_select" ON public.estoque_item_aliases
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "aliases_insert" ON public.estoque_item_aliases;
CREATE POLICY "aliases_insert" ON public.estoque_item_aliases
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "aliases_update" ON public.estoque_item_aliases;
CREATE POLICY "aliases_update" ON public.estoque_item_aliases
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aliases_delete" ON public.estoque_item_aliases;
CREATE POLICY "aliases_delete" ON public.estoque_item_aliases
  FOR DELETE TO authenticated USING (true);
