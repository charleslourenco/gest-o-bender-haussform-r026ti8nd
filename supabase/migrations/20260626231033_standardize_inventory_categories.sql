DO $$
BEGIN
  -- Normaliza algumas categorias comuns existentes para os novos padrões
  UPDATE public.estoque_itens
  SET categoria = 'Ferragens'
  WHERE categoria ILIKE '%ferragem%' OR categoria ILIKE '%ferragens%' OR categoria ILIKE '%dobradiça%' OR categoria ILIKE '%corrediça%';

  UPDATE public.estoque_itens
  SET categoria = 'Chapas'
  WHERE categoria ILIKE '%chapa%' OR categoria ILIKE '%mdf%';

  UPDATE public.estoque_itens
  SET categoria = 'Fitas de borda'
  WHERE categoria ILIKE '%fita%' OR categoria ILIKE '%borda%';

  UPDATE public.estoque_itens
  SET categoria = 'Acessórios'
  WHERE categoria ILIKE '%acessório%' OR categoria ILIKE '%acessorio%' OR categoria ILIKE '%lixeira%' OR categoria ILIKE '%tempero%';

  UPDATE public.estoque_itens
  SET categoria = 'Sistemas de fixação'
  WHERE categoria ILIKE '%fixação%' OR categoria ILIKE '%fixacao%' OR categoria ILIKE '%parafuso%' OR categoria ILIKE '%bucha%';

  UPDATE public.estoque_itens
  SET categoria = 'Serralheria'
  WHERE categoria ILIKE '%serralheria%' OR categoria ILIKE '%metal%' OR categoria ILIKE '%ferro%';

  UPDATE public.estoque_itens
  SET categoria = 'Estofaria'
  WHERE categoria ILIKE '%estofaria%' OR categoria ILIKE '%tecido%' OR categoria ILIKE '%espuma%';

  UPDATE public.estoque_itens
  SET categoria = 'Portas de alumínio e vidro'
  WHERE categoria ILIKE '%alumínio%' OR categoria ILIKE '%aluminio%' OR categoria ILIKE '%vidro%';

  UPDATE public.estoque_itens
  SET categoria = 'Espelhos'
  WHERE categoria ILIKE '%espelho%';

  UPDATE public.estoque_itens
  SET categoria = 'Perfil puxador/puxador'
  WHERE categoria ILIKE '%perfil%' OR categoria ILIKE '%puxador%';

  UPDATE public.estoque_itens
  SET categoria = 'Iluminação'
  WHERE categoria ILIKE '%iluminação%' OR categoria ILIKE '%iluminacao%' OR categoria ILIKE '%led%' OR categoria ILIKE '%lâmpada%';
END $$;
