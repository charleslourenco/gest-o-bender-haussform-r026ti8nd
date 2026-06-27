-- Add receiver identity columns to estoque_caixas for legally robust delivery receipts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'estoque_caixas' AND column_name = 'recebedor_nome'
  ) THEN
    ALTER TABLE public.estoque_caixas ADD COLUMN recebedor_nome TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'estoque_caixas' AND column_name = 'recebedor_cpf'
  ) THEN
    ALTER TABLE public.estoque_caixas ADD COLUMN recebedor_cpf TEXT;
  END IF;
END $$;

-- Allow anon to update receiver identity fields on pending (non-delivered) boxes
-- so the public receipt page can persist the receiver's data when confirming delivery.
DROP POLICY IF EXISTS "estoque_caixas_anon_update_recebedor" ON public.estoque_caixas;
CREATE POLICY "estoque_caixas_anon_update_recebedor" ON public.estoque_caixas
  FOR UPDATE TO anon
  USING (status <> 'entregue')
  WITH CHECK (status <> 'entregue');
