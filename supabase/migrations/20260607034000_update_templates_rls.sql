DO $$
BEGIN
  DROP POLICY IF EXISTS "templates_select_all" ON public.templates;
  CREATE POLICY "templates_select_all" ON public.templates FOR SELECT TO authenticated USING (true);
  
  DROP POLICY IF EXISTS "templates_insert_all" ON public.templates;
  CREATE POLICY "templates_insert_all" ON public.templates FOR INSERT TO authenticated WITH CHECK (true);
  
  DROP POLICY IF EXISTS "templates_update_all" ON public.templates;
  CREATE POLICY "templates_update_all" ON public.templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  
  DROP POLICY IF EXISTS "templates_delete_all" ON public.templates;
  CREATE POLICY "templates_delete_all" ON public.templates FOR DELETE TO authenticated USING (true);
END $$;
