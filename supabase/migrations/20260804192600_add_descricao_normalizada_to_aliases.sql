-- Add normalized description column to estoque_item_aliases for accent/case-insensitive matching
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.estoque_item_aliases
  ADD COLUMN IF NOT EXISTS descricao_normalizada TEXT;

-- Backfill existing rows with normalized description (lowercase, trimmed, accent-insensitive)
DO $$
BEGIN
  UPDATE public.estoque_item_aliases
  SET descricao_normalizada = lower(trim(unaccent(descricao_nota)))
  WHERE descricao_normalizada IS NULL
    AND descricao_nota IS NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_estoque_item_aliases_descricao_normalizada
  ON public.estoque_item_aliases(descricao_normalizada);
