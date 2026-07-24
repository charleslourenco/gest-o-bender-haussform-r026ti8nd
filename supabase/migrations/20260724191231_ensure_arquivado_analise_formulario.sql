-- Ensure arquivado_analise column exists on formulario_comercial (idempotent)
ALTER TABLE public.formulario_comercial
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;
