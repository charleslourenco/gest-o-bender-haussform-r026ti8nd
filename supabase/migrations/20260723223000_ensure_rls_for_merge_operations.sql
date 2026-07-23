DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'estoque_movimentacoes_all' AND polrelid = 'public.estoque_movimentacoes'::regclass
  ) THEN
    CREATE POLICY "estoque_movimentacoes_all" ON public.estoque_movimentacoes
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'estoque_alocacoes_all' AND polrelid = 'public.estoque_alocacoes'::regclass
  ) THEN
    CREATE POLICY "estoque_alocacoes_all" ON public.estoque_alocacoes
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'estoque_sobras_all' AND polrelid = 'public.estoque_sobras'::regclass
  ) THEN
    CREATE POLICY "estoque_sobras_all" ON public.estoque_sobras
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'estoque_caixas_itens_all' AND polrelid = 'public.estoque_caixas_itens'::regclass
  ) THEN
    CREATE POLICY "estoque_caixas_itens_all" ON public.estoque_caixas_itens
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy WHERE polname = 'aliases_all' AND polrelid = 'public.estoque_item_aliases'::regclass
  ) THEN
    CREATE POLICY "aliases_all" ON public.estoque_item_aliases
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
