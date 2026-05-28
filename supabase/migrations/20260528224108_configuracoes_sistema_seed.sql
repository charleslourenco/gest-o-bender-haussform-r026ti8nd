DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.configuracoes_sistema) THEN
    INSERT INTO public.configuracoes_sistema (markup_vista, markup_prazo) VALUES (0.40, 0.35);
  END IF;
END $$;
