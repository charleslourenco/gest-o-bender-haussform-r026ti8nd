DO $$
BEGIN
  -- Update existing items to be flagged as outsourced if they have a matching purchase request,
  -- so they are correctly hidden from the analysis view
  UPDATE public.produtos_servicos_projeto psp
  SET is_outsourced = true
  WHERE is_outsourced = false
  AND EXISTS (
    SELECT 1 FROM public.solicitacoes_compra sc
    WHERE sc.cliente_id = psp.cliente_id 
      AND sc.nome_item = psp.nome_produto
  );
END $$;
