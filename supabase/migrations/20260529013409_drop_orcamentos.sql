-- Drop policies for orcamentos_itens
DROP POLICY IF EXISTS "orcamentos_itens_all" ON public.orcamentos_itens;
DROP POLICY IF EXISTS "orcamentos_itens_delete" ON public.orcamentos_itens;
DROP POLICY IF EXISTS "orcamentos_itens_insert" ON public.orcamentos_itens;
DROP POLICY IF EXISTS "orcamentos_itens_select" ON public.orcamentos_itens;
DROP POLICY IF EXISTS "orcamentos_itens_update" ON public.orcamentos_itens;

-- Drop policies for orcamentos_ambientes
DROP POLICY IF EXISTS "orcamentos_ambientes_all" ON public.orcamentos_ambientes;
DROP POLICY IF EXISTS "orcamentos_ambientes_delete" ON public.orcamentos_ambientes;
DROP POLICY IF EXISTS "orcamentos_ambientes_insert" ON public.orcamentos_ambientes;
DROP POLICY IF EXISTS "orcamentos_ambientes_select" ON public.orcamentos_ambientes;
DROP POLICY IF EXISTS "orcamentos_ambientes_update" ON public.orcamentos_ambientes;

-- Drop policies for orcamentos_engenharia
DROP POLICY IF EXISTS "orcamentos_engenharia_all" ON public.orcamentos_engenharia;
DROP POLICY IF EXISTS "orcamentos_engenharia_delete" ON public.orcamentos_engenharia;
DROP POLICY IF EXISTS "orcamentos_engenharia_insert" ON public.orcamentos_engenharia;
DROP POLICY IF EXISTS "orcamentos_engenharia_select" ON public.orcamentos_engenharia;
DROP POLICY IF EXISTS "orcamentos_engenharia_update" ON public.orcamentos_engenharia;

-- Drop triggers
DROP TRIGGER IF EXISTS set_orcamentos_engenharia_atualizado_em ON public.orcamentos_engenharia;

-- Drop tables securely starting from dependencies (children) to main table (parent)
DROP TABLE IF EXISTS public.orcamentos_itens CASCADE;
DROP TABLE IF EXISTS public.orcamentos_ambientes CASCADE;
DROP TABLE IF EXISTS public.orcamentos_engenharia CASCADE;
