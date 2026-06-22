ALTER TABLE public.documentos_cliente
ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_cliente_usuario_id ON public.documentos_cliente(usuario_id);
