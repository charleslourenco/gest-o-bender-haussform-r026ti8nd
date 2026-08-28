-- Migration: Add a_classificar status, update trigger auto_create_conta_pagar_from_nota, and normalize statuses

-- 1. Update the trigger function auto_create_conta_pagar_from_nota to set status_pagamento = 'a_classificar'
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
      'a_classificar',
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

-- Recreate trigger on notas_fiscais
DROP TRIGGER IF EXISTS on_nota_fiscal_created ON public.notas_fiscais;
CREATE TRIGGER on_nota_fiscal_created
  AFTER INSERT ON public.notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_conta_pagar_from_nota();

-- 2. Migrate existing records from NF with status_pagamento = 'Aguardando' (or 'aguardando') and data_vencimento IS NULL -> 'a_classificar'
UPDATE public.contas_pagar
SET status_pagamento = 'a_classificar', atualizado_em = NOW()
WHERE nota_fiscal_id IS NOT NULL
  AND data_vencimento IS NULL
  AND lower(status_pagamento) = 'aguardando';

-- 3. Normalize any remaining 'Aguardando' (uppercase/mixed case) -> 'aguardando' (lowercase) in contas_pagar
UPDATE public.contas_pagar
SET status_pagamento = 'aguardando', atualizado_em = NOW()
WHERE status_pagamento = 'Aguardando';

-- 4. Also normalize 'Agrupado' to 'agrupado' and 'Pago' to 'pago' for consistency if any exist
UPDATE public.contas_pagar
SET status_pagamento = 'agrupado', atualizado_em = NOW()
WHERE status_pagamento = 'Agrupado';

UPDATE public.contas_pagar
SET status_pagamento = 'pago', atualizado_em = NOW()
WHERE status_pagamento = 'Pago';
