-- Idempotently set the default value of arquivado_analise to false on produtos_servicos_projeto
-- and backfill any existing NULL values. Fixes the "Análise Técnica" page crash caused by NULL
-- values being cast to boolean by the frontend.

ALTER TABLE IF EXISTS public.produtos_servicos_projeto
  ALTER COLUMN arquivado_analise SET DEFAULT false;

UPDATE public.produtos_servicos_projeto
SET arquivado_analise = false
WHERE arquivado_analise IS NULL;
