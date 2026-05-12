-- Migration for Estoque e Compras Module (Intelligent Purchase & Inventory)
DO $$
BEGIN

  CREATE TABLE IF NOT EXISTS public.estoque_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    categoria TEXT,
    quantidade NUMERIC NOT NULL DEFAULT 0,
    unidade TEXT NOT NULL DEFAULT 'un',
    estoque_minimo NUMERIC NOT NULL DEFAULT 0,
    valor_unitario NUMERIC NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.pedidos_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor TEXT NOT NULL,
    data_pedido DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovado, recebido, cancelado
    valor_total NUMERIC NOT NULL DEFAULT 0,
    notas TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.pedidos_compra_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos_compra(id) ON DELETE CASCADE NOT NULL,
    item_id UUID REFERENCES public.estoque_itens(id) ON DELETE RESTRICT NOT NULL,
    quantidade NUMERIC NOT NULL,
    valor_unitario NUMERIC NOT NULL,
    valor_total NUMERIC NOT NULL
  );

  CREATE TABLE IF NOT EXISTS public.notas_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES public.pedidos_compra(id) ON DELETE SET NULL,
    numero_nota TEXT,
    fornecedor TEXT NOT NULL,
    valor_total NUMERIC NOT NULL,
    data_emissao DATE,
    arquivo_url TEXT,
    status_reconciliacao TEXT NOT NULL DEFAULT 'pendente', -- pendente, validado, divergente
    dados_ocr JSONB,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.estoque_itens(id) ON DELETE CASCADE NOT NULL,
    tipo TEXT NOT NULL, -- entrada, saida, ajuste
    quantidade NUMERIC NOT NULL,
    nota_fiscal_id UUID REFERENCES public.notas_fiscais(id) ON DELETE SET NULL,
    pedido_id UUID REFERENCES public.pedidos_compra(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

END $$;

-- Enable RLS
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_compra_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "estoque_itens_all" ON public.estoque_itens;
CREATE POLICY "estoque_itens_all" ON public.estoque_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pedidos_compra_all" ON public.pedidos_compra;
CREATE POLICY "pedidos_compra_all" ON public.pedidos_compra FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pedidos_compra_itens_all" ON public.pedidos_compra_itens;
CREATE POLICY "pedidos_compra_itens_all" ON public.pedidos_compra_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "notas_fiscais_all" ON public.notas_fiscais;
CREATE POLICY "notas_fiscais_all" ON public.notas_fiscais FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "estoque_movimentacoes_all" ON public.estoque_movimentacoes;
CREATE POLICY "estoque_movimentacoes_all" ON public.estoque_movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed Data
DO $$
BEGIN
  INSERT INTO public.estoque_itens (id, nome, categoria, quantidade, unidade, estoque_minimo, valor_unitario) VALUES
  ('11111111-1111-1111-1111-111111111111'::uuid, 'MDF Branco TX 15mm', 'Chapas', 45, 'chapa', 10, 185.00),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Fita de Borda Branca 22mm', 'Fitas', 12, 'rolo', 5, 45.00),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Dobradiça Reta com Amortecedor', 'Ferragens', 250, 'un', 100, 4.50),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'Corrediça Telescópica 450mm', 'Ferragens', 80, 'par', 50, 18.90),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'Parafuso 4x16', 'Fixação', 5000, 'un', 2000, 0.05)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.pedidos_compra (id, fornecedor, data_pedido, status, valor_total) VALUES
  ('66666666-6666-6666-6666-666666666666'::uuid, 'Leo Madeiras', CURRENT_DATE, 'pendente', 1500.00),
  ('77777777-7777-7777-7777-777777777777'::uuid, 'GMad', CURRENT_DATE - INTERVAL '2 days', 'recebido', 850.00)
  ON CONFLICT (id) DO NOTHING;
END $$;
