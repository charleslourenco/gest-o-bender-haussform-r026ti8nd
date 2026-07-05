-- Bank Accounts Management
-- Tables: contas_bancarias, transferencias_bancarias
-- Columns: conta_bancaria_id on contas_pagar and contas_receber
-- Triggers: balance updates on payments, receipts and transfers

CREATE TABLE IF NOT EXISTS public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_exibicao TEXT NOT NULL,
  banco TEXT,
  agencia TEXT,
  numero_conta TEXT,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  saldo_atual NUMERIC NOT NULL DEFAULT 0,
  status BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transferencias_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_origem_id UUID REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  conta_destino_id UUID REFERENCES public.contas_bancarias(id) ON DELETE CASCADE,
  valor NUMERIC NOT NULL,
  data_transferencia DATE NOT NULL,
  descricao TEXT,
  usuario_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contas_pagar
  ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

ALTER TABLE public.contas_receber
  ADD COLUMN IF NOT EXISTS conta_bancaria_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL;

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transferencias_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contas_bancarias_select" ON public.contas_bancarias;
CREATE POLICY "contas_bancarias_select" ON public.contas_bancarias
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "contas_bancarias_insert" ON public.contas_bancarias;
CREATE POLICY "contas_bancarias_insert" ON public.contas_bancarias
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contas_bancarias_update" ON public.contas_bancarias;
CREATE POLICY "contas_bancarias_update" ON public.contas_bancarias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contas_bancarias_delete" ON public.contas_bancarias;
CREATE POLICY "contas_bancarias_delete" ON public.contas_bancarias
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "transferencias_select" ON public.transferencias_bancarias;
CREATE POLICY "transferencias_select" ON public.transferencias_bancarias
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "transferencias_insert" ON public.transferencias_bancarias;
CREATE POLICY "transferencias_insert" ON public.transferencias_bancarias
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "transferencias_update" ON public.transferencias_bancarias;
CREATE POLICY "transferencias_update" ON public.transferencias_bancarias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "transferencias_delete" ON public.transferencias_bancarias;
CREATE POLICY "transferencias_delete" ON public.transferencias_bancarias
  FOR DELETE TO authenticated USING (true);

-- Trigger: update saldo_atual on contas_pagar changes (decrement when paid)
CREATE OR REPLACE FUNCTION public.update_saldo_on_conta_pagar()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF lower(COALESCE(NEW.status_pagamento, '')) = 'pago' AND NEW.conta_bancaria_id IS NOT NULL THEN
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual - NEW.valor, atualizado_em = NOW()
      WHERE id = NEW.conta_bancaria_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF lower(COALESCE(OLD.status_pagamento, '')) = 'pago' AND OLD.conta_bancaria_id IS NOT NULL THEN
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual + OLD.valor, atualizado_em = NOW()
      WHERE id = OLD.conta_bancaria_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (lower(COALESCE(NEW.status_pagamento, '')) = 'pago' AND lower(COALESCE(OLD.status_pagamento, '')) <> 'pago') THEN
      IF NEW.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual - NEW.valor, atualizado_em = NOW()
        WHERE id = NEW.conta_bancaria_id;
      END IF;
    ELSIF (lower(COALESCE(NEW.status_pagamento, '')) <> 'pago' AND lower(COALESCE(OLD.status_pagamento, '')) = 'pago') THEN
      IF OLD.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual + OLD.valor, atualizado_em = NOW()
        WHERE id = OLD.conta_bancaria_id;
      END IF;
    ELSIF (lower(COALESCE(NEW.status_pagamento, '')) = 'pago' AND lower(COALESCE(OLD.status_pagamento, '')) = 'pago'
           AND NEW.conta_bancaria_id IS DISTINCT FROM OLD.conta_bancaria_id) THEN
      IF OLD.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual + OLD.valor, atualizado_em = NOW()
        WHERE id = OLD.conta_bancaria_id;
      END IF;
      IF NEW.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual - NEW.valor, atualizado_em = NOW()
        WHERE id = NEW.conta_bancaria_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contas_pagar_saldo ON public.contas_pagar;
CREATE TRIGGER trg_contas_pagar_saldo
  AFTER INSERT OR UPDATE OR DELETE ON public.contas_pagar
  FOR EACH ROW EXECUTE FUNCTION public.update_saldo_on_conta_pagar();

-- Trigger: update saldo_atual on contas_receber changes (increment when paid)
CREATE OR REPLACE FUNCTION public.update_saldo_on_conta_receber()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF lower(COALESCE(NEW.status_pagamento, '')) = 'pago' AND NEW.conta_bancaria_id IS NOT NULL THEN
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual + NEW.valor, atualizado_em = NOW()
      WHERE id = NEW.conta_bancaria_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF lower(COALESCE(OLD.status_pagamento, '')) = 'pago' AND OLD.conta_bancaria_id IS NOT NULL THEN
      UPDATE public.contas_bancarias
      SET saldo_atual = saldo_atual - OLD.valor, atualizado_em = NOW()
      WHERE id = OLD.conta_bancaria_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (lower(COALESCE(NEW.status_pagamento, '')) = 'pago' AND lower(COALESCE(OLD.status_pagamento, '')) <> 'pago') THEN
      IF NEW.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual + NEW.valor, atualizado_em = NOW()
        WHERE id = NEW.conta_bancaria_id;
      END IF;
    ELSIF (lower(COALESCE(NEW.status_pagamento, '')) <> 'pago' AND lower(COALESCE(OLD.status_pagamento, '')) = 'pago') THEN
      IF OLD.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual - OLD.valor, atualizado_em = NOW()
        WHERE id = OLD.conta_bancaria_id;
      END IF;
    ELSIF (lower(COALESCE(NEW.status_pagamento, '')) = 'pago' AND lower(COALESCE(OLD.status_pagamento, '')) = 'pago'
           AND NEW.conta_bancaria_id IS DISTINCT FROM OLD.conta_bancaria_id) THEN
      IF OLD.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual - OLD.valor, atualizado_em = NOW()
        WHERE id = OLD.conta_bancaria_id;
      END IF;
      IF NEW.conta_bancaria_id IS NOT NULL THEN
        UPDATE public.contas_bancarias
        SET saldo_atual = saldo_atual + NEW.valor, atualizado_em = NOW()
        WHERE id = NEW.conta_bancaria_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contas_receber_saldo ON public.contas_receber;
CREATE TRIGGER trg_contas_receber_saldo
  AFTER INSERT OR UPDATE OR DELETE ON public.contas_receber
  FOR EACH ROW EXECUTE FUNCTION public.update_saldo_on_conta_receber();

-- Trigger: process transferencia (decrement origin, increment destination)
CREATE OR REPLACE FUNCTION public.process_transferencia()
RETURNS trigger AS $$
BEGIN
  IF NEW.conta_origem_id = NEW.conta_destino_id THEN
    RAISE EXCEPTION 'Conta de origem e destino não podem ser iguais';
  END IF;
  IF NEW.valor <= 0 THEN
    RAISE EXCEPTION 'Valor da transferência deve ser maior que zero';
  END IF;
  UPDATE public.contas_bancarias
  SET saldo_atual = saldo_atual - NEW.valor, atualizado_em = NOW()
  WHERE id = NEW.conta_origem_id;
  UPDATE public.contas_bancarias
  SET saldo_atual = saldo_atual + NEW.valor, atualizado_em = NOW()
  WHERE id = NEW.conta_destino_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_transferencia_saldo ON public.transferencias_bancarias;
CREATE TRIGGER trg_transferencia_saldo
  BEFORE INSERT ON public.transferencias_bancarias
  FOR EACH ROW EXECUTE FUNCTION public.process_transferencia();

-- Initialize saldo_atual = saldo_inicial for pre-existing accounts
UPDATE public.contas_bancarias
SET saldo_atual = saldo_inicial
WHERE saldo_atual = 0 AND saldo_inicial <> 0;

-- Update group_contas_pagar to accept an optional conta_bancaria_id
DROP FUNCTION IF EXISTS public.group_contas_pagar(uuid[], integer, text, date, uuid);

CREATE OR REPLACE FUNCTION public.group_contas_pagar(
  p_ids uuid[],
  p_num_parcelas integer,
  p_meio_pagamento text,
  p_data_primeiro_vencimento date,
  p_user_id uuid,
  p_conta_bancaria_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fornecedores text[];
  v_fornecedor text;
  v_total numeric;
  v_valor_parcela numeric;
  v_descricao_refs text;
  v_current_date date;
  v_i integer;
BEGIN
  IF array_length(p_ids, 1) IS NULL OR array_length(p_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Selecione pelo menos 2 contas para agrupar';
  END IF;

  SELECT array_agg(DISTINCT fornecedor) INTO v_fornecedores
  FROM public.contas_pagar
  WHERE id = ANY(p_ids);

  IF v_fornecedores IS NULL OR array_length(v_fornecedores, 1) > 1 THEN
    RAISE EXCEPTION 'Todas as contas devem pertencer ao mesmo fornecedor';
  END IF;

  v_fornecedor := v_fornecedores[1];

  IF EXISTS (
    SELECT 1 FROM public.contas_pagar
    WHERE id = ANY(p_ids)
      AND (lower(status_pagamento) = 'pago' OR lower(status_pagamento) = 'agrupado')
  ) THEN
    RAISE EXCEPTION 'Não é possível agrupar contas pagas ou já agrupadas';
  END IF;

  IF p_num_parcelas IS NULL OR p_num_parcelas < 1 THEN
    RAISE EXCEPTION 'Número de parcelas inválido';
  END IF;

  SELECT COALESCE(SUM(valor), 0) INTO v_total
  FROM public.contas_pagar
  WHERE id = ANY(p_ids);

  v_valor_parcela := round(v_total / p_num_parcelas, 2);

  SELECT string_agg(COALESCE(descricao, id::text), ', ') INTO v_descricao_refs
  FROM public.contas_pagar
  WHERE id = ANY(p_ids);

  UPDATE public.contas_pagar
  SET status_pagamento = 'Agrupado', atualizado_em = NOW()
  WHERE id = ANY(p_ids);

  v_current_date := p_data_primeiro_vencimento;
  FOR v_i IN 1..p_num_parcelas LOOP
    INSERT INTO public.contas_pagar (
      user_id, fornecedor, descricao, categoria, valor, data_vencimento,
      status_pagamento, meio_pagamento, conta_bancaria_id, criado_em, atualizado_em
    ) VALUES (
      p_user_id,
      v_fornecedor,
      'Pagamento agrupado: ' || v_fornecedor || ' - Parcela ' || v_i || '/' || p_num_parcelas || ' (Ref: ' || v_descricao_refs || ')',
      'Agrupamento',
      v_valor_parcela,
      v_current_date,
      'aguardando',
      p_meio_pagamento,
      p_conta_bancaria_id,
      NOW(),
      NOW()
    );
    v_current_date := (v_current_date + INTERVAL '1 month')::date;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'fornecedor', v_fornecedor,
    'total', v_total,
    'parcelas', p_num_parcelas,
    'valor_parcela', v_valor_parcela
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.group_contas_pagar(uuid[], integer, text, date, uuid, uuid) TO authenticated;
