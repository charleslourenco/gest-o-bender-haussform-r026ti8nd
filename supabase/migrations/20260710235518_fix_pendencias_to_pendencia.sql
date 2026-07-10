DO $$
BEGIN
  UPDATE public.produtos_servicos_projeto
  SET status_analise = 'pendencia',
      atualizado_em = NOW()
  WHERE status_analise = 'pendencias';
END $$;
