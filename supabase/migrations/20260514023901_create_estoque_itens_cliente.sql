CREATE TABLE IF NOT EXISTS public.estoque_itens_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nome TEXT NOT NULL,
  produto TEXT NOT NULL,
  recebido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregue_em TIMESTAMPTZ,
  responsavel_entrega TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.estoque_itens_cliente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estoque_itens_cliente_all" ON public.estoque_itens_cliente;
CREATE POLICY "estoque_itens_cliente_all" ON public.estoque_itens_cliente
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
