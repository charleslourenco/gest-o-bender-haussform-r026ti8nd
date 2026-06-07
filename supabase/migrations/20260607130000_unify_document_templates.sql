DO $$
BEGIN
  -- 1. Transfer relevant data from document_templates to templates
  -- Ensure idempotency using ON CONFLICT DO NOTHING
  INSERT INTO public.templates (id, nome, tipo, arquivo_url, status, descricao)
  SELECT 
    id, 
    nome, 
    'documento' AS tipo, 
    'migrado' AS arquivo_url, 
    CASE WHEN ativo THEN 'ativo' ELSE 'inativo' END AS status,
    'Migrado do legado document_templates' AS descricao
  FROM public.document_templates
  ON CONFLICT (id) DO NOTHING;

  -- 2. Drop the legacy table to avoid system confusion and redundancy
  DROP TABLE IF EXISTS public.document_templates CASCADE;

  -- 3. Fix RLS policies for templates table ensuring robust admin and user access
  -- Drop existing policies first to be completely idempotent
  DROP POLICY IF EXISTS "templates_delete_all" ON public.templates;
  DROP POLICY IF EXISTS "templates_delete_own" ON public.templates;
  DROP POLICY IF EXISTS "templates_insert_all" ON public.templates;
  DROP POLICY IF EXISTS "templates_insert_own" ON public.templates;
  DROP POLICY IF EXISTS "templates_select_all" ON public.templates;
  DROP POLICY IF EXISTS "templates_select_own" ON public.templates;
  DROP POLICY IF EXISTS "templates_update_all" ON public.templates;
  DROP POLICY IF EXISTS "templates_update_own" ON public.templates;
  
  -- Create clean unified policies using public.is_admin()
  CREATE POLICY "templates_select" ON public.templates 
    FOR SELECT TO authenticated USING (true);
    
  CREATE POLICY "templates_insert" ON public.templates 
    FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
    
  CREATE POLICY "templates_update" ON public.templates 
    FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
    
  CREATE POLICY "templates_delete" ON public.templates 
    FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

END $$;
