DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.montadores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome_completo TEXT NOT NULL,
        telefone TEXT,
        status TEXT NOT NULL DEFAULT 'Disponível',
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.alocacao_montagem (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        montador_id UUID NOT NULL REFERENCES public.montadores(id) ON DELETE CASCADE,
        card_id UUID NOT NULL REFERENCES public.produtos_servicos_projeto(id) ON DELETE CASCADE,
        criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.montadores ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.alocacao_montagem ENABLE ROW LEVEL SECURITY;
END $$;

DROP POLICY IF EXISTS "montadores_all" ON public.montadores;
CREATE POLICY "montadores_all" ON public.montadores FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "alocacao_montagem_all" ON public.alocacao_montagem;
CREATE POLICY "alocacao_montagem_all" ON public.alocacao_montagem FOR ALL TO authenticated USING (true) WITH CHECK (true);
