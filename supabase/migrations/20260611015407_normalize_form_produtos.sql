DO $$
DECLARE
  rec RECORD;
  new_json jsonb;
  item jsonb;
  idx int;
BEGIN
  -- Normalize produtos_servicos
  FOR rec IN SELECT id, produtos_servicos FROM public.formulario_comercial WHERE produtos_servicos IS NOT NULL AND jsonb_typeof(produtos_servicos) = 'array'
  LOOP
    new_json := '[]'::jsonb;
    FOR idx IN 0 .. jsonb_array_length(rec.produtos_servicos) - 1
    LOOP
      item := rec.produtos_servicos->idx;
      
      IF item ? 'quantidade' THEN
        IF NOT (item ? 'qtd') THEN
          item := jsonb_set(item, '{qtd}', item->'quantidade', true);
        END IF;
        item := item - 'quantidade';
      END IF;

      IF item ? 'description' THEN
        IF NOT (item ? 'descricao') THEN
          item := jsonb_set(item, '{descricao}', item->'description', true);
        END IF;
        item := item - 'description';
      END IF;

      new_json := new_json || item;
    END LOOP;
    
    UPDATE public.formulario_comercial
    SET produtos_servicos = new_json
    WHERE id = rec.id;
  END LOOP;

  -- Normalize itens
  FOR rec IN SELECT id, itens FROM public.formulario_comercial WHERE itens IS NOT NULL AND jsonb_typeof(itens) = 'array'
  LOOP
    new_json := '[]'::jsonb;
    FOR idx IN 0 .. jsonb_array_length(rec.itens) - 1
    LOOP
      item := rec.itens->idx;
      
      IF item ? 'quantidade' THEN
        IF NOT (item ? 'qtd') THEN
          item := jsonb_set(item, '{qtd}', item->'quantidade', true);
        END IF;
        item := item - 'quantidade';
      END IF;

      IF item ? 'description' THEN
        IF NOT (item ? 'descricao') THEN
          item := jsonb_set(item, '{descricao}', item->'description', true);
        END IF;
        item := item - 'description';
      END IF;

      new_json := new_json || item;
    END LOOP;
    
    UPDATE public.formulario_comercial
    SET itens = new_json
    WHERE id = rec.id;
  END LOOP;
END $$;
