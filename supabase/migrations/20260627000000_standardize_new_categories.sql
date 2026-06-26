DO $$
BEGIN
  -- Normaliza algumas categorias existentes para os novos padrões (Idempotent update)
  UPDATE public.estoque_itens
  SET categoria = 'Colas e adesivos'
  WHERE categoria ILIKE '%cola%' OR categoria ILIKE '%adesivo%' OR categoria ILIKE '%silicone%' OR categoria ILIKE '%pu%';

  UPDATE public.estoque_itens
  SET categoria = 'Insumos'
  WHERE categoria ILIKE '%insumo%' OR categoria ILIKE '%estopa%' OR categoria ILIKE '%thinner%' OR categoria ILIKE '%lixa%' OR categoria ILIKE '%pincel%';

  UPDATE public.estoque_itens
  SET categoria = 'Material elétrico'
  WHERE (categoria ILIKE '%elétrico%' OR categoria ILIKE '%eletrico%' OR categoria ILIKE '%fio%' OR categoria ILIKE '%cabo%' OR categoria ILIKE '%tomada%' OR categoria ILIKE '%interruptor%') AND categoria NOT ILIKE '%iluminação%';
END $$;
