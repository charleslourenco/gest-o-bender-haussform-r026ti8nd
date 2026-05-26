DO $$
DECLARE
  v_cliente1_id uuid := gen_random_uuid();
  v_cliente2_id uuid := gen_random_uuid();
  v_cliente3_id uuid := gen_random_uuid();
  v_orc1_id uuid := gen_random_uuid();
  v_orc2_id uuid := gen_random_uuid();
  v_orc3_id uuid := gen_random_uuid();
  v_orc4_id uuid := gen_random_uuid();
  v_amb1_id uuid := gen_random_uuid();
  v_amb2_id uuid := gen_random_uuid();
  v_amb3_id uuid := gen_random_uuid();
  v_amb4_id uuid := gen_random_uuid();
BEGIN
  -- Insert Clientes
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE email = 'ana.silva@example.com') THEN
    INSERT INTO public.clientes (id, nome, email, telefone, status)
    VALUES (v_cliente1_id, 'Ana Silva', 'ana.silva@example.com', '11999999999', 'Ativo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE email = 'carlos.o@example.com') THEN
    INSERT INTO public.clientes (id, nome, email, telefone, status)
    VALUES (v_cliente2_id, 'Carlos Oliveira', 'carlos.o@example.com', '11888888888', 'Ativo');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE email = 'mariana.s@example.com') THEN
    INSERT INTO public.clientes (id, nome, email, telefone, status)
    VALUES (v_cliente3_id, 'Mariana Santos', 'mariana.s@example.com', '11777777777', 'Ativo');
  END IF;

  -- Re-select IDs to ensure we use the correct ones for the orcamentos
  SELECT id INTO v_cliente1_id FROM public.clientes WHERE email = 'ana.silva@example.com' LIMIT 1;
  SELECT id INTO v_cliente2_id FROM public.clientes WHERE email = 'carlos.o@example.com' LIMIT 1;
  SELECT id INTO v_cliente3_id FROM public.clientes WHERE email = 'mariana.s@example.com' LIMIT 1;

  -- Insert Orcamentos
  IF NOT EXISTS (SELECT 1 FROM public.orcamentos_engenharia WHERE nome = 'Projeto Cozinha e Sala') THEN
    INSERT INTO public.orcamentos_engenharia (id, nome, cliente_id, status, desconto, criado_em)
    VALUES (v_orc1_id, 'Projeto Cozinha e Sala', v_cliente1_id, 'Rascunho', 0, NOW() - interval '2 days');
    
    INSERT INTO public.orcamentos_ambientes (id, orcamento_id, nome)
    VALUES (v_amb1_id, v_orc1_id, 'Cozinha');
    
    INSERT INTO public.orcamentos_itens (ambiente_id, nome_item, quantidade, custo_unitario, markup)
    VALUES
      (v_amb1_id, 'MDF Branco 15mm', 10, 150.00, 2.5),
      (v_amb1_id, 'Ferragens', 1, 500.00, 2.0);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orcamentos_engenharia WHERE nome = 'Móveis Quarto Casal') THEN
    INSERT INTO public.orcamentos_engenharia (id, nome, cliente_id, status, desconto, criado_em)
    VALUES (v_orc2_id, 'Móveis Quarto Casal', v_cliente2_id, 'Enviado', 500, NOW() - interval '5 days');
    
    INSERT INTO public.orcamentos_ambientes (id, orcamento_id, nome)
    VALUES (v_amb2_id, v_orc2_id, 'Quarto Casal');
    
    INSERT INTO public.orcamentos_itens (ambiente_id, nome_item, quantidade, custo_unitario, markup)
    VALUES (v_amb2_id, 'MDF Amadeirado 18mm', 8, 200.00, 2.5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orcamentos_engenharia WHERE nome = 'Home Office Completo') THEN
    INSERT INTO public.orcamentos_engenharia (id, nome, cliente_id, status, desconto, criado_em)
    VALUES (v_orc3_id, 'Home Office Completo', v_cliente3_id, 'Aprovado', 1000, NOW() - interval '10 days');
    
    INSERT INTO public.orcamentos_ambientes (id, orcamento_id, nome)
    VALUES (v_amb3_id, v_orc3_id, 'Home Office');
    
    INSERT INTO public.orcamentos_itens (ambiente_id, nome_item, quantidade, custo_unitario, markup)
    VALUES (v_amb3_id, 'MDF Cinza 15mm', 12, 160.00, 2.5);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orcamentos_engenharia WHERE nome = 'Banheiro e Lavanderia') THEN
    INSERT INTO public.orcamentos_engenharia (id, nome, cliente_id, status, desconto, criado_em)
    VALUES (v_orc4_id, 'Banheiro e Lavanderia', v_cliente1_id, 'Rejeitado', 0, NOW() - interval '15 days');
    
    INSERT INTO public.orcamentos_ambientes (id, orcamento_id, nome)
    VALUES (v_amb4_id, v_orc4_id, 'Banheiro');
    
    INSERT INTO public.orcamentos_itens (ambiente_id, nome_item, quantidade, custo_unitario, markup)
    VALUES (v_amb4_id, 'MDF Naval 15mm', 5, 180.00, 2.5);
  END IF;

END $$;
