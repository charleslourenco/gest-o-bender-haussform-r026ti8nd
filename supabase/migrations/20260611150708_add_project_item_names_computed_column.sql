-- Index to optimize querying related items by their commercial form
CREATE INDEX IF NOT EXISTS idx_produtos_servicos_projeto_formulario_comercial_id 
ON public.produtos_servicos_projeto(formulario_comercial_id);

-- Computed column to retrieve the names of all real project items excluding generic counts
CREATE OR REPLACE FUNCTION public.project_item_names(psp public.produtos_servicos_projeto)
RETURNS TEXT AS $func$
DECLARE
  v_names TEXT;
BEGIN
  IF psp.formulario_comercial_id IS NULL THEN
    RETURN '';
  END IF;

  SELECT string_agg(nome_produto, ', ' ORDER BY criado_em ASC)
  INTO v_names
  FROM public.produtos_servicos_projeto
  WHERE formulario_comercial_id = psp.formulario_comercial_id
    AND id != psp.id
    AND nome_produto !~* '^\d+\s*(item|itens|items|produto|produtos)';

  RETURN COALESCE(v_names, '');
END;
$func$ LANGUAGE plpgsql STABLE;
