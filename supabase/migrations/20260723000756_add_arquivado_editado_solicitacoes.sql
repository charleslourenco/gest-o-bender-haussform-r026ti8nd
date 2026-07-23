DO $$
BEGIN
  ALTER TABLE public.solicitacoes_compra
    ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT false;

  ALTER TABLE public.solicitacoes_compra
    ADD COLUMN IF NOT EXISTS editado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

  ALTER TABLE public.solicitacoes_compra
    ADD COLUMN IF NOT EXISTS editado_em TIMESTAMPTZ;
END $$;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_compra_arquivado
  ON public.solicitacoes_compra (arquivado);
