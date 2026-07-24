-- Add arquivado_analise column to formulario_comercial to support archiving main cards in Análise Técnica
ALTER TABLE public.formulario_comercial
  ADD COLUMN IF NOT EXISTS arquivado_analise BOOLEAN NOT NULL DEFAULT false;

-- Ensure existing RLS policies on formulario_comercial cover the new column (no-op if already present)
-- The column inherits the table's existing RLS policies, so no new policies are required.
