DO $$
BEGIN
  -- Recreate broad RLS policies for authenticated users to ensure full CRUD access
  DROP POLICY IF EXISTS "orcamentos_engenharia_select" ON public.orcamentos_engenharia;
  DROP POLICY IF EXISTS "orcamentos_engenharia_insert" ON public.orcamentos_engenharia;
  DROP POLICY IF EXISTS "orcamentos_engenharia_update" ON public.orcamentos_engenharia;
  DROP POLICY IF EXISTS "orcamentos_engenharia_delete" ON public.orcamentos_engenharia;
  DROP POLICY IF EXISTS "orcamentos_engenharia_delete_auth" ON public.orcamentos_engenharia;

  CREATE POLICY "orcamentos_engenharia_select" ON public.orcamentos_engenharia FOR SELECT TO authenticated USING (true);
  CREATE POLICY "orcamentos_engenharia_insert" ON public.orcamentos_engenharia FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "orcamentos_engenharia_update" ON public.orcamentos_engenharia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "orcamentos_engenharia_delete" ON public.orcamentos_engenharia FOR DELETE TO authenticated USING (true);

  DROP POLICY IF EXISTS "orcamentos_ambientes_select" ON public.orcamentos_ambientes;
  DROP POLICY IF EXISTS "orcamentos_ambientes_insert" ON public.orcamentos_ambientes;
  DROP POLICY IF EXISTS "orcamentos_ambientes_update" ON public.orcamentos_ambientes;
  DROP POLICY IF EXISTS "orcamentos_ambientes_delete" ON public.orcamentos_ambientes;

  CREATE POLICY "orcamentos_ambientes_select" ON public.orcamentos_ambientes FOR SELECT TO authenticated USING (true);
  CREATE POLICY "orcamentos_ambientes_insert" ON public.orcamentos_ambientes FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "orcamentos_ambientes_update" ON public.orcamentos_ambientes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "orcamentos_ambientes_delete" ON public.orcamentos_ambientes FOR DELETE TO authenticated USING (true);

  DROP POLICY IF EXISTS "orcamentos_itens_select" ON public.orcamentos_itens;
  DROP POLICY IF EXISTS "orcamentos_itens_insert" ON public.orcamentos_itens;
  DROP POLICY IF EXISTS "orcamentos_itens_update" ON public.orcamentos_itens;
  DROP POLICY IF EXISTS "orcamentos_itens_delete" ON public.orcamentos_itens;

  CREATE POLICY "orcamentos_itens_select" ON public.orcamentos_itens FOR SELECT TO authenticated USING (true);
  CREATE POLICY "orcamentos_itens_insert" ON public.orcamentos_itens FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "orcamentos_itens_update" ON public.orcamentos_itens FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "orcamentos_itens_delete" ON public.orcamentos_itens FOR DELETE TO authenticated USING (true);

  -- Insert seed client if it does not exist
  INSERT INTO public.clientes (id, nome, email, telefone, status)
  VALUES ('c0000000-0000-0000-0000-000000000001'::uuid, 'Cliente Teste Orçamentos', 'cliente@teste.com', '11999999999', 'Ativo')
  ON CONFLICT (id) DO NOTHING;

  -- Insert seed budget if it does not exist
  INSERT INTO public.orcamentos_engenharia (id, nome, cliente_id, status, desconto, markup_global)
  VALUES ('e0000000-0000-0000-0000-000000000001'::uuid, 'Orçamento Residência Alpha', 'c0000000-0000-0000-0000-000000000001'::uuid, 'Rascunho', 0, 2.5)
  ON CONFLICT (id) DO NOTHING;

  -- Insert seed environment
  INSERT INTO public.orcamentos_ambientes (id, orcamento_id, nome)
  VALUES ('a0000000-0000-0000-0000-000000000001'::uuid, 'e0000000-0000-0000-0000-000000000001'::uuid, 'Cozinha Planejada')
  ON CONFLICT (id) DO NOTHING;

  -- Insert seed item
  INSERT INTO public.orcamentos_itens (id, ambiente_id, nome_item, quantidade, unidade_medida, custo_unitario, markup)
  VALUES ('f0000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 'MDF Branco TX', 2, 'un', 150.00, 2.5)
  ON CONFLICT (id) DO NOTHING;
END $$;
