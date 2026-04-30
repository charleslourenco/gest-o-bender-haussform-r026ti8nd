CREATE TABLE IF NOT EXISTS public.formulario_comercial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    cpf TEXT,
    data_nascimento DATE,
    profissao TEXT,
    renda NUMERIC,
    referencia_bancaria TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lead_id)
);

ALTER TABLE public.formulario_comercial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "formulario_comercial_select" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_select" ON public.formulario_comercial FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "formulario_comercial_insert" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_insert" ON public.formulario_comercial FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "formulario_comercial_update" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_update" ON public.formulario_comercial FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "formulario_comercial_delete" ON public.formulario_comercial;
CREATE POLICY "formulario_comercial_delete" ON public.formulario_comercial FOR DELETE TO authenticated USING (true);
