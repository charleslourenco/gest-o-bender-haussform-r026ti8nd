DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.templates WHERE external_template_id = 'DBABA512-F9C2-4A21-81E2-C635DAF16A83') THEN
    INSERT INTO public.templates (nome, tipo, arquivo_url, external_template_id, status)
    VALUES ('Contrato de Prestação de Serviços', 'pdfmonkey', 'pdfmonkey', 'DBABA512-F9C2-4A21-81E2-C635DAF16A83', 'ativo');
  END IF;
END $$;
