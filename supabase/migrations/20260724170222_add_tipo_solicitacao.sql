-- Add tipo_solicitacao column to solicitacoes_compra (idempotent)
DO $$
BEGIN
  ALTER TABLE public.solicitacoes_compra
    ADD COLUMN IF NOT EXISTS tipo_solicitacao TEXT NOT NULL DEFAULT 'Cliente';
END $$;

-- Add check constraint idempotently
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'solicitacoes_compra_tipo_solicitacao_check'
  ) THEN
    ALTER TABLE public.solicitacoes_compra
      ADD CONSTRAINT solicitacoes_compra_tipo_solicitacao_check
      CHECK (tipo_solicitacao IN ('Cliente', 'Produção', 'Reposição'));
  END IF;
END $$;

-- Backfill existing rows with default value
UPDATE public.solicitacoes_compra
SET tipo_solicitacao = 'Cliente'
WHERE tipo_solicitacao IS NULL
   OR tipo_solicitacao NOT IN ('Cliente', 'Produção', 'Reposição');

-- Helpful index for filtering by tipo_solicitacao
CREATE INDEX IF NOT EXISTS idx_solicitacoes_compra_tipo_solicitacao
  ON public.solicitacoes_compra (tipo_solicitacao);
