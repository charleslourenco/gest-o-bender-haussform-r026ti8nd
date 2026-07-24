-- Idempotently ensure arquivado_analise column exists on both produtos_servicos_projeto and formulario_comercial
ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.formulario_comercial
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;
