-- Enable RLS on the templates table
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Drop the old policies with Portuguese names (if they exist)
DROP POLICY IF EXISTS "Usuário autenticado consegue ver templates criados por ele" ON public.templates;
DROP POLICY IF EXISTS "Usuário autenticado consegue criar templates" ON public.templates;
DROP POLICY IF EXISTS "Usuário autenticado consegue editar templates criados por ele" ON public.templates;
DROP POLICY IF EXISTS "Usuário autenticado consegue deletar templates criados por ele" ON public.templates;

-- Drop the new policies to ensure idempotency
DROP POLICY IF EXISTS "templates_select_own" ON public.templates;
DROP POLICY IF EXISTS "templates_insert_own" ON public.templates;
DROP POLICY IF EXISTS "templates_update_own" ON public.templates;
DROP POLICY IF EXISTS "templates_delete_own" ON public.templates;

-- Política 1 — SELECT
CREATE POLICY "templates_select_own" ON public.templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Política 2 — INSERT
CREATE POLICY "templates_insert_own" ON public.templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Política 3 — UPDATE
CREATE POLICY "templates_update_own" ON public.templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Política 4 — DELETE
CREATE POLICY "templates_delete_own" ON public.templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
