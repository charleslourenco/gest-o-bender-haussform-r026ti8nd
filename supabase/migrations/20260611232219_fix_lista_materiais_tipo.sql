DO $$
BEGIN
  -- Normaliza os documentos com tipo 'lista de materiais' ou parecidos para 'lista_materiais'
  UPDATE public.documentos_cliente
  SET tipo = 'lista_materiais'
  WHERE LOWER(tipo) IN ('lista de materiais', 'lista_de_materiais', 'lista de material');
END $$;
