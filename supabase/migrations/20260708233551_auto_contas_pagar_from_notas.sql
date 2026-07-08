-- Migration: Make data_vencimento nullable and auto-create contas_pagar from notas_fiscais

-- 1. Make data_vencimento nullable in contas_pagar
ALTER TABLE public.contas_pagar ALTER COLUMN data_vencimento DROP NOT NULL;

-- 2. Add nota_fiscal_id column for linking and idempotency
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL;

-- 3. Create index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_contas_pagar_nota_fiscal_id ON public.contas_pagar(nota_fiscal_id);

-- 4. Create trigger function to auto-create contas_pagar when nota_fiscal is inserted
CREATE OR REPLACE FUNCTION public.auto_create_conta_pagar_from_nota()
RETURNS trigger AS $$
BEGIN
  -- Idempotency: skip if conta_pagar already exists for this nota_fiscal
  IF NOT EXISTS (
    SELECT 1 FROM public.contas_pagar
    WHERE nota_fiscal_id = NEW.id
  ) THEN
    INSERT INTO public.contas_pagar (
      user_id,
      fornecedor,
      valor,
      comprovante_url,
      status_pagamento,
      data_vencimento,
      categoria,
      descricao,
      nota_fiscal_id,
      criado_em,
      atualizado_em
    ) VALUES (
      auth.uid(),
      COALESCE(NEW.fornecedor, 'Desconhecido'),
      COALESCE(NEW.valor_total, 0),
      NEW.arquivo_url,
      'Aguardando',
      NULL,
      'Insumos/Estoque',
      'Nota Fiscal: ' || COALESCE(NEW.numero_nota, 'Sem numero'),
      NEW.id,
      NOW(),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on notas_fiscais AFTER INSERT
DROP TRIGGER IF EXISTS on_nota_fiscal_created ON public.notas_fiscais;
CREATE TRIGGER on_nota_fiscal_created
  AFTER INSERT ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_conta_pagar_from_nota();
