DO $$
BEGIN
  -- Atualizar a categoria na tabela estoque_itens
  UPDATE public.estoque_itens
  SET categoria = 'Colas/Adesivos/Solventes'
  WHERE categoria ILIKE 'colas e adesivos';

  -- Atualizar também na tabela de contas a pagar, caso a categoria seja espelhada
  UPDATE public.contas_pagar
  SET categoria = 'Colas/Adesivos/Solventes'
  WHERE categoria ILIKE 'colas e adesivos';

  -- Atualizar na tabela de contas a receber por precaução
  UPDATE public.contas_receber
  SET categoria = 'Colas/Adesivos/Solventes'
  WHERE categoria ILIKE 'colas e adesivos';
END $$;
