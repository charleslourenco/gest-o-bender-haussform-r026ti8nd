-- TABELA 1: produtos_servicos_projeto
CREATE TABLE IF NOT EXISTS public.produtos_servicos_projeto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formulario_comercial_id UUID REFERENCES public.formulario_comercial(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    nome_produto TEXT NOT NULL,
    qtd INTEGER NOT NULL,
    descricao TEXT,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(12,2) NOT NULL,
    status_analise TEXT NOT NULL DEFAULT 'iniciar',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.produtos_servicos_projeto ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_servicos_projeto_select" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_select" ON public.produtos_servicos_projeto
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.formulario_comercial
            WHERE formulario_comercial.id = produtos_servicos_projeto.formulario_comercial_id
            AND formulario_comercial.usuario_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "produtos_servicos_projeto_insert" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_insert" ON public.produtos_servicos_projeto
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.formulario_comercial
            WHERE formulario_comercial.id = produtos_servicos_projeto.formulario_comercial_id
            AND formulario_comercial.usuario_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "produtos_servicos_projeto_update" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_update" ON public.produtos_servicos_projeto
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.formulario_comercial
            WHERE formulario_comercial.id = produtos_servicos_projeto.formulario_comercial_id
            AND formulario_comercial.usuario_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.formulario_comercial
            WHERE formulario_comercial.id = produtos_servicos_projeto.formulario_comercial_id
            AND formulario_comercial.usuario_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "produtos_servicos_projeto_delete" ON public.produtos_servicos_projeto;
CREATE POLICY "produtos_servicos_projeto_delete" ON public.produtos_servicos_projeto
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.formulario_comercial
            WHERE formulario_comercial.id = produtos_servicos_projeto.formulario_comercial_id
            AND formulario_comercial.usuario_id = auth.uid()
        )
    );


-- TABELA 2: dossies
CREATE TABLE IF NOT EXISTS public.dossies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    formulario_comercial_id UUID REFERENCES public.formulario_comercial(id) ON DELETE CASCADE,
    contrato_url TEXT,
    termo_conclusao_url TEXT,
    termo_garantia_url TEXT,
    ata_reuniao_url TEXT,
    caderno_tecnico_url TEXT,
    renders_url TEXT,
    arquivo_projeto_url TEXT,
    drafts_medida_url TEXT,
    status TEXT NOT NULL DEFAULT 'em_documentacao',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dossies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dossies_select" ON public.dossies;
CREATE POLICY "dossies_select" ON public.dossies FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "dossies_insert" ON public.dossies;
CREATE POLICY "dossies_insert" ON public.dossies FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dossies_update" ON public.dossies;
CREATE POLICY "dossies_update" ON public.dossies FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "dossies_delete" ON public.dossies;
CREATE POLICY "dossies_delete" ON public.dossies FOR DELETE TO authenticated USING (user_id = auth.uid());


-- TABELA 3: contas_receber
CREATE TABLE IF NOT EXISTS public.contas_receber (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    formulario_comercial_id UUID REFERENCES public.formulario_comercial(id) ON DELETE CASCADE,
    numero_parcela TEXT NOT NULL,
    data_vencimento DATE NOT NULL,
    valor NUMERIC(12,2) NOT NULL,
    status_pagamento TEXT NOT NULL DEFAULT 'aguardando',
    data_pagamento DATE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contas_receber ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contas_receber_select" ON public.contas_receber;
CREATE POLICY "contas_receber_select" ON public.contas_receber FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_receber_insert" ON public.contas_receber;
CREATE POLICY "contas_receber_insert" ON public.contas_receber FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_receber_update" ON public.contas_receber;
CREATE POLICY "contas_receber_update" ON public.contas_receber FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "contas_receber_delete" ON public.contas_receber;
CREATE POLICY "contas_receber_delete" ON public.contas_receber FOR DELETE TO authenticated USING (user_id = auth.uid());
