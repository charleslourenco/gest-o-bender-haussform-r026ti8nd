DO $$
BEGIN
  ALTER TABLE public.documentos_cliente ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();
END $$;

CREATE OR REPLACE FUNCTION public.handle_documentos_cliente_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_documentos_cliente_atualizado_em ON public.documentos_cliente;
CREATE TRIGGER set_documentos_cliente_atualizado_em
  BEFORE UPDATE ON public.documentos_cliente
  FOR EACH ROW EXECUTE FUNCTION public.handle_documentos_cliente_updated_at();
