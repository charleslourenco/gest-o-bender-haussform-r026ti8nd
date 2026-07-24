-- Idempotently ensure arquivado_analise column exists on both formulario_comercial and produtos_servicos_projeto
ALTER TABLE public.formulario_comercial
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.produtos_servicos_projeto
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;
