-- Create RPC function to atomically group multiple contas_pagar into installments
-- This ensures transaction-like behavior: if any step fails, nothing is persisted

CREATE OR REPLACE FUNCTION public.group_contas_pagar(
  p_ids uuid[],
  p_num_parcelas integer,
  p_meio_pagamento text,
  p_data_primeiro_vencimento date,
  p_user_id uuid
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
  -- Validate at least 2 items selected
  IF array_length(p_ids, 1) IS NULL OR array_length(p_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Selecione pelo menos 2 contas para agrupar';
  END IF;

  -- Validate all belong to the same supplier
  SELECT array_agg(DISTINCT fornecedor) INTO v_fornecedores
  FROM public.contas_pagar
  WHERE id = ANY(p_ids);

  IF v_fornecedores IS NULL OR array_length(v_fornecedores, 1) > 1 THEN
    RAISE EXCEPTION 'Todas as contas devem pertencer ao mesmo fornecedor';
  END IF;

  v_fornecedor := v_fornecedores[1];

  -- Validate none are already paid or grouped
  IF EXISTS (
    SELECT 1 FROM public.contas_pagar
    WHERE id = ANY(p_ids)
      AND (lower(status_pagamento) = 'pago' OR lower(status_pagamento) = 'agrupado')
  ) THEN
    RAISE EXCEPTION 'Não é possível agrupar contas pagas ou já agrupadas';
  END IF;

  -- Validate number of installments
  IF p_num_parcelas IS NULL OR p_num_parcelas < 1 THEN
    RAISE EXCEPTION 'Número de parcelas inválido';
  END IF;

  -- Calculate total sum
  SELECT COALESCE(SUM(valor), 0) INTO v_total
  FROM public.contas_pagar
  WHERE id = ANY(p_ids);

  v_valor_parcela := round(v_total / p_num_parcelas, 2);

  -- Build reference description from original descriptions and ids
  SELECT string_agg(
    COALESCE(descricao, id::text),
    ', '
  ) INTO v_descricao_refs
  FROM public.contas_pagar
  WHERE id = ANY(p_ids);

  -- Update original records to 'Agrupado' status (audit trail)
  UPDATE public.contas_pagar
  SET status_pagamento = 'Agrupado',
      atualizado_em = NOW()
  WHERE id = ANY(p_ids);

  -- Insert new installment records
  v_current_date := p_data_primeiro_vencimento;
  FOR v_i IN 1..p_num_parcelas LOOP
    INSERT INTO public.contas_pagar (
      user_id,
      fornecedor,
      descricao,
      categoria,
      valor,
      data_vencimento,
      status_pagamento,
      meio_pagamento,
      criado_em,
      atualizado_em
    ) VALUES (
      p_user_id,
      v_fornecedor,
      'Pagamento agrupado: ' || v_fornecedor || ' - Parcela ' || v_i || '/' || p_num_parcelas || ' (Ref: ' || v_descricao_refs || ')',
      'Agrupamento',
      v_valor_parcela,
      v_current_date,
      'aguardando',
      p_meio_pagamento,
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.group_contas_pagar(uuid[], integer, text, date, uuid) TO authenticated;
