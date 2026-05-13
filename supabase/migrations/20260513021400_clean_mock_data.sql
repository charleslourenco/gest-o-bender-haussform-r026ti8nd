DO $$
BEGIN
  -- Remover dados de seed/mock injetados previamente no estoque e na análise técnica
  -- Isso garante que as informações visualizadas no sistema sejam 100% reais, em conformidade com as regras da Zenaide e do Otto
  DELETE FROM public.kanban_historico;
  DELETE FROM public.produtos_servicos_projeto;
  DELETE FROM public.estoque_movimentacoes;
  DELETE FROM public.pedidos_compra_itens;
  DELETE FROM public.pedidos_compra;
  DELETE FROM public.notas_fiscais;
  DELETE FROM public.estoque_itens;
END $$;
