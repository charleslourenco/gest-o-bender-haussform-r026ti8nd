-- Create estoque_item_aliases table for persistent NF-to-inventory mapping
CREATE TABLE IF NOT EXISTS public.estoque_item_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_nota TEXT NOT NULL,
  item_id UUID REFERENCES public.estoque_itens(id) ON DELETE CASCADE NOT NULL,
  usuario_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS estoque_item_aliases_descricao_nota_key
  ON public.estoque_item_aliases(descricao_nota);

CREATE INDEX IF NOT EXISTS idx_estoque_item_aliases_item_id
  ON public.estoque_item_aliases(item_id);

ALTER TABLE public.estoque_item_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aliases_select" ON public.estoque_item_aliases;
CREATE POLICY "aliases_select" ON public.estoque_item_aliases
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "aliases_insert" ON public.estoque_item_aliases;
CREATE POLICY "aliases_insert" ON public.estoque_item_aliases
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "aliases_delete" ON public.estoque_item_aliases;
CREATE POLICY "aliases_delete" ON public.estoque_item_aliases
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "aliases_update" ON public.estoque_item_aliases;
CREATE POLICY "aliases_update" ON public.estoque_item_aliases
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
