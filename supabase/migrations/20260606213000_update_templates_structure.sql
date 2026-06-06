DO $$
BEGIN
  -- Remove old ||| artifacts if any exist in document_templates
  UPDATE public.document_templates
  SET conteudo = replace(conteudo, ' ||| ', ' ')
  WHERE conteudo LIKE '% ||| %';

  -- Add nova-secao class to known section headers to force page breaks
  UPDATE public.document_templates
  SET conteudo = replace(conteudo, '<h2>CONTRATO', '<h2 class="nova-secao">CONTRATO')
  WHERE conteudo LIKE '%<h2>CONTRATO%';

  UPDATE public.document_templates
  SET conteudo = replace(conteudo, '<h2>TERMO', '<h2 class="nova-secao">TERMO')
  WHERE conteudo LIKE '%<h2>TERMO%';

  -- Same for templates table
  UPDATE public.templates
  SET descricao = replace(descricao, ' ||| ', ' ')
  WHERE descricao LIKE '% ||| %';
END $$;
