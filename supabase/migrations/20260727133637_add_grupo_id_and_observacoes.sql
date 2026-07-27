-- Add grupo_id and observacoes columns to contas_pagar and contas_receber
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS grupo_id UUID;
ALTER TABLE public.contas_pagar ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS grupo_id UUID;
ALTER TABLE public.contas_receber ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Create indexes on grupo_id
CREATE INDEX IF NOT EXISTS idx_contas_pagar_grupo_id ON public.contas_pagar(grupo_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_grupo_id ON public.contas_receber(grupo_id);

-- Update group_contas_pagar to generate and assign shared grupo_id
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
  v_grupo_id uuid;
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

  v_grupo_id := gen_random_uuid();

  UPDATE public.contas_pagar
  SET status_pagamento = 'Agrupado', grupo_id = v_grupo_id, atualizado_em = NOW()
  WHERE id = ANY(p_ids);

  v_current_date := p_data_primeiro_vencimento;
  FOR v_i IN 1..p_num_parcelas LOOP
    INSERT INTO public.contas_pagar (
      user_id, fornecedor, descricao, categoria, valor, data_vencimento,
      status_pagamento, meio_pagamento, conta_bancaria_id, grupo_id,
      criado_em, atualizado_em
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
      v_grupo_id,
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
    'valor_parcela', v_valor_parcela,
    'grupo_id', v_grupo_id
  );
END;
$$;

-- Recreate insert_conta_pagar_with_divisoes with grupo_id and observacoes support
DROP FUNCTION IF EXISTS public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text) CASCADE;

CREATE FUNCTION public.insert_conta_pagar_with_divisoes(
  p_fornecedor text,
  p_descricao text,
  p_valor numeric,
  p_data_vencimento date,
  p_categoria text,
  p_user_id uuid,
  p_conta_bancaria_id uuid,
  p_meses integer,
  p_divisoes jsonb,
  p_grupo_id uuid DEFAULT NULL,
  p_observacoes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_i integer;
  v_current_date date;
  v_conta_id uuid;
  v_divisao jsonb;
BEGIN
  v_current_date := p_data_vencimento;
  FOR v_i IN 1..p_meses LOOP
    INSERT INTO public.contas_pagar (
      user_id, fornecedor, descricao, valor, data_vencimento,
      categoria, status_pagamento, conta_bancaria_id, grupo_id, observacoes,
      criado_em, atualizado_em
    ) VALUES (
      p_user_id, p_fornecedor, p_descricao, p_valor, v_current_date,
      p_categoria, 'aguardando', p_conta_bancaria_id, p_grupo_id, p_observacoes,
      NOW(), NOW()
    ) RETURNING id INTO v_conta_id;

    FOR v_divisao IN SELECT * FROM jsonb_array_elements(p_divisoes) LOOP
      INSERT INTO public.contas_pagar_divisoes (conta_pagar_id, descricao, valor)
      VALUES (v_conta_id, v_divisao->>'descricao', (v_divisao->>'valor')::numeric);
    END LOOP;

    v_current_date := (v_current_date + INTERVAL '1 month')::date;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'meses', p_meses);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_conta_pagar_with_divisoes(text, text, numeric, date, text, uuid, uuid, integer, jsonb, uuid, text) TO authenticated;
