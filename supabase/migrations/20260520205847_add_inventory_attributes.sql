ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS marca text;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS cor text;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS espessura_mm numeric;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS largura_mm numeric;
ALTER TABLE public.estoque_itens ADD COLUMN IF NOT EXISTS comprimento_m numeric;

DO $block$
BEGIN
  -- Data Backfill: Extract specific fields from metadados_normalizados into explicit columns
  UPDATE public.estoque_itens
  SET
    marca = CASE WHEN metadados_normalizados->>'marca' IS NOT NULL AND metadados_normalizados->>'marca' != 'null' THEN metadados_normalizados->>'marca' ELSE marca END,
    cor = CASE WHEN metadados_normalizados->>'cor' IS NOT NULL AND metadados_normalizados->>'cor' != 'null' THEN metadados_normalizados->>'cor' ELSE cor END,
    espessura_mm = CASE WHEN metadados_normalizados->>'espessura_mm' IS NOT NULL AND metadados_normalizados->>'espessura_mm' != 'null' THEN (metadados_normalizados->>'espessura_mm')::numeric ELSE espessura_mm END,
    largura_mm = CASE WHEN metadados_normalizados->>'largura_mm' IS NOT NULL AND metadados_normalizados->>'largura_mm' != 'null' THEN (metadados_normalizados->>'largura_mm')::numeric ELSE largura_mm END,
    comprimento_m = CASE WHEN metadados_normalizados->>'comprimento_m' IS NOT NULL AND metadados_normalizados->>'comprimento_m' != 'null' THEN (metadados_normalizados->>'comprimento_m')::numeric ELSE comprimento_m END
  WHERE metadados_normalizados IS NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error backfilling data: %', SQLERRM;
END $block$;
