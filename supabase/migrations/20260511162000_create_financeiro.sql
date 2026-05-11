DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'contas_pagar') THEN
    CREATE TABLE public.contas_pagar (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        fornecedor TEXT NOT NULL,
        descricao TEXT,
        categoria TEXT,
        valor NUMERIC NOT NULL,
        data_vencimento DATE NOT NULL,
        data_pagamento DATE,
        status_pagamento TEXT NOT NULL DEFAULT 'aguardando',
        codigo_barras TEXT,
        comprovante_url TEXT,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'logs_ia') THEN
    CREATE TABLE public.logs_ia (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        acao TEXT NOT NULL,
        detalhes JSONB,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_ia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total contas_pagar" ON public.contas_pagar;
CREATE POLICY "Acesso total contas_pagar" ON public.contas_pagar
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total logs_ia" ON public.logs_ia;
CREATE POLICY "Acesso total logs_ia" ON public.logs_ia
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
