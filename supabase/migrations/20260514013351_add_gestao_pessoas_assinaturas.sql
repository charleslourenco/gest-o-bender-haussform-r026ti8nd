ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS clt_id UUID REFERENCES public.equipe_clt(id) ON DELETE CASCADE;
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS pj_id UUID REFERENCES public.parceiros_pj(id) ON DELETE CASCADE;

ALTER TABLE public.envelopes_assinatura ADD COLUMN IF NOT EXISTS clt_id UUID REFERENCES public.equipe_clt(id) ON DELETE CASCADE;
ALTER TABLE public.envelopes_assinatura ADD COLUMN IF NOT EXISTS pj_id UUID REFERENCES public.parceiros_pj(id) ON DELETE CASCADE;
