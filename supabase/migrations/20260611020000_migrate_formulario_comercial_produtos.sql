DO $$
DECLARE
  rec record;
  old_array jsonb;
  new_array jsonb;
  item jsonb;
  new_item jsonb;
BEGIN
  FOR rec IN SELECT id, produtos_servicos FROM public.formulario_comercial WHERE produtos_servicos IS NOT NULL AND jsonb_typeof(produtos_servicos) = 'array' LOOP
    old_array := rec.produtos_servicos;
    new_array := '[]'::jsonb;
    
    FOR item IN SELECT * FROM jsonb_array_elements(old_array) LOOP
      new_item := item;
      
      -- Migrate 'quantidade' to 'qtd' if 'qtd' is missing
      IF item ? 'quantidade' AND NOT item ? 'qtd' THEN
        new_item := new_item || jsonb_build_object('qtd', item->'quantidade');
        new_item := new_item - 'quantidade';
      END IF;
      
      -- Migrate 'ambiente' to 'descricao' if 'descricao' is missing
      IF item ? 'ambiente' AND NOT item ? 'descricao' THEN
        new_item := new_item || jsonb_build_object('descricao', item->'ambiente');
        new_item := new_item - 'ambiente';
      END IF;
      
      -- Migrate 'tipo_fluxo' to 'is_outsourced'
      IF item ? 'tipo_fluxo' AND NOT item ? 'is_outsourced' THEN
        IF item->>'tipo_fluxo' = 'Compra Direta' THEN
          new_item := new_item || jsonb_build_object('is_outsourced', true);
        ELSE
          new_item := new_item || jsonb_build_object('is_outsourced', false);
        END IF;
        new_item := new_item - 'tipo_fluxo';
      END IF;
      
      new_array := new_array || new_item;
    END LOOP;
    
    UPDATE public.formulario_comercial
    SET produtos_servicos = new_array
    WHERE id = rec.id;
  END LOOP;
END $$;
