-- Migration: Auditoria e Correções Gerais do Sistema Bender Haussform
-- Itens:
-- 1. Endurecer gatilho handle_new_user (recusar auto-cadastro público não autorizado) e desativar conta cgb@gobor.com.br
-- 2. Corrigir 119 leads com kanban_ativo = true E arquivado_comercial = true -> set kanban_ativo = false
-- 3. Deduplicar os pares de clientes reais e higienizar/enriquecer clientes "Novo Cliente"
-- 4. Corrigir contas a receber com status 'pago' sem data_pagamento
-- 5. Corrigir alocação de estoque excedente

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- =========================================================================
  -- (1) DESATIVAR CONTA SUSPEITA cgb@gobor.com.br
  -- =========================================================================
  -- Desativar em public.users
  UPDATE public.users
  SET status = false, atualizado_em = NOW()
  WHERE email = 'cgb@gobor.com.br';

  -- Banir em auth.users por segurança preventiva enquanto aguarda decisão do cliente
  UPDATE auth.users
  SET banned_until = '2099-01-01 00:00:00+00'::timestamptz
  WHERE email = 'cgb@gobor.com.br';

  -- Encerrar sessões ativas da conta
  DELETE FROM auth.sessions
  WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'cgb@gobor.com.br');

  -- =========================================================================
  -- (2) CORRIGIR OS 119 LEADS COM ESTADO IMPOSSÍVEL
  -- Arquivamento comercial deve desativar do Kanban (kanban_ativo = false)
  -- Preservando integralmente status, data_venda, consultor_id, notas, etc.
  -- =========================================================================
  UPDATE public.leads
  SET kanban_ativo = false, atualizado_em = NOW()
  WHERE arquivado_comercial = true AND kanban_ativo = true;

  -- =========================================================================
  -- (3) DEDUPLICAR CLIENTES (3 PARES REAIS)
  -- Helper dinâmico: remapeia todas as tabelas com coluna cliente_id
  -- =========================================================================

  -- PAR A: "Fermina"
  -- Sobrevivente: 561ddd1e-1e3e-4825-95fb-daedffb77372 (tem contas a receber e projetos)
  -- Duplicado: 69afa9eb-4b98-499f-9548-aac1effeb05a (tem CPF preenchido)
  IF EXISTS (SELECT 1 FROM public.clientes WHERE id = '561ddd1e-1e3e-4825-95fb-daedffb77372'::uuid) 
     AND EXISTS (SELECT 1 FROM public.clientes WHERE id = '69afa9eb-4b98-499f-9548-aac1effeb05a'::uuid) THEN
    
    FOR rec IN
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'cliente_id'
        AND table_name <> 'clientes'
    LOOP
      EXECUTE format(
        'UPDATE public.%I SET %I = $1 WHERE %I = $2',
        rec.table_name, rec.column_name, rec.column_name
      ) USING '561ddd1e-1e3e-4825-95fb-daedffb77372'::uuid, '69afa9eb-4b98-499f-9548-aac1effeb05a'::uuid;
    END LOOP;

    -- Deletar duplicado antigo primeiro para liberar unique CPF
    DELETE FROM public.clientes WHERE id = '69afa9eb-4b98-499f-9548-aac1effeb05a'::uuid;

    -- Atribuir CPF ao sobrevivente
    UPDATE public.clientes
    SET cpf = '168.893.129-53',
        atualizado_em = NOW()
    WHERE id = '561ddd1e-1e3e-4825-95fb-daedffb77372'::uuid;
  END IF;

  -- PAR B: "Laboratório Faita"
  -- Sobrevivente: 28746ebc-c660-4f2d-a9b5-b9a48f16fc6e (ativo, com 20 contas a receber e 34 produtos)
  -- Duplicado vazio: 281fca4f-d972-4b1e-a54e-6dbf408e0772
  IF EXISTS (SELECT 1 FROM public.clientes WHERE id = '28746ebc-c660-4f2d-a9b5-b9a48f16fc6e'::uuid) 
     AND EXISTS (SELECT 1 FROM public.clientes WHERE id = '281fca4f-d972-4b1e-a54e-6dbf408e0772'::uuid) THEN
    
    FOR rec IN
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'cliente_id'
        AND table_name <> 'clientes'
    LOOP
      EXECUTE format(
        'UPDATE public.%I SET %I = $1 WHERE %I = $2',
        rec.table_name, rec.column_name, rec.column_name
      ) USING '28746ebc-c660-4f2d-a9b5-b9a48f16fc6e'::uuid, '281fca4f-d972-4b1e-a54e-6dbf408e0772'::uuid;
    END LOOP;

    DELETE FROM public.clientes WHERE id = '281fca4f-d972-4b1e-a54e-6dbf408e0772'::uuid;
  END IF;

  -- Também enriquecer com o cadastro antigo '68b474b1-e6a6-4c4c-9003-fff7a7c2de8f' (Laboratório de Analises Clinicas Faita Ltda com CNPJ)
  IF EXISTS (SELECT 1 FROM public.clientes WHERE id = '68b474b1-e6a6-4c4c-9003-fff7a7c2de8f'::uuid) THEN
    FOR rec IN
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'cliente_id'
        AND table_name <> 'clientes'
    LOOP
      EXECUTE format(
        'UPDATE public.%I SET %I = $1 WHERE %I = $2',
        rec.table_name, rec.column_name, rec.column_name
      ) USING '28746ebc-c660-4f2d-a9b5-b9a48f16fc6e'::uuid, '68b474b1-e6a6-4c4c-9003-fff7a7c2de8f'::uuid;
    END LOOP;

    -- Re-apontar qualquer referência de lead_id em clientes ou outros locais se houver
    UPDATE public.clientes
    SET lead_id = '176ac867-c366-4724-95af-13e78cc326b2'::uuid
    WHERE lead_id = 'b51d4744-9d55-4ffe-9deb-c80f207fd18d'::uuid;

    DELETE FROM public.clientes WHERE id = '68b474b1-e6a6-4c4c-9003-fff7a7c2de8f'::uuid;

    UPDATE public.clientes
    SET cpf = '02.073.169/0001-05',
        email = CASE WHEN (email IS NULL OR email = '') THEN 'dorly@farmafaita.com' ELSE email END,
        atualizado_em = NOW()
    WHERE id = '28746ebc-c660-4f2d-a9b5-b9a48f16fc6e'::uuid;
  END IF;

  -- PAR C: "Rôgga" / "Rôgga - Decorado Itapoa"
  -- Sobrevivente: b535d318-69a8-4944-bb4b-750f375cd5dd
  -- Duplicado vazio: c2fd07f5-6c47-449b-a188-e357b3cbd885
  IF EXISTS (SELECT 1 FROM public.clientes WHERE id = 'b535d318-69a8-4944-bb4b-750f375cd5dd'::uuid) 
     AND EXISTS (SELECT 1 FROM public.clientes WHERE id = 'c2fd07f5-6c47-449b-a188-e357b3cbd885'::uuid) THEN
    
    FOR rec IN
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'cliente_id'
        AND table_name <> 'clientes'
    LOOP
      EXECUTE format(
        'UPDATE public.%I SET %I = $1 WHERE %I = $2',
        rec.table_name, rec.column_name, rec.column_name
      ) USING 'b535d318-69a8-4944-bb4b-750f375cd5dd'::uuid, 'c2fd07f5-6c47-449b-a188-e357b3cbd885'::uuid;
    END LOOP;

    DELETE FROM public.clientes WHERE id = 'c2fd07f5-6c47-449b-a188-e357b3cbd885'::uuid;
  END IF;

  -- =========================================================================
  -- (3.1) TRATAR OS 21 CLIENTES "Novo Cliente"
  -- Regra:
  -- - Se tiver vínculos reais com caixas de estoque ou contas a pagar ou documentos:
  --   renomear com base nas evidências encontradas:
  --   * f42547b1-3e6f-42fe-919d-f18b2b429425 -> 'Ajuste de Estoque - Almoxarifado' (tem caixas e compras de ferragens)
  --   * 8942e8f1-983f-42a8-bcfa-09d7c99c3584 -> 'Apto Brooklyn (Santer)' (documento "Caderno de Imagens - Apto Brooklyn" e caixa "DAVI - SANTER")
  --   * 7d428c26-2e43-4e89-9d84-a7a02b67e661 -> 'Douglas Fabrin (Santer)' (caixa "DOUGLAS - FIXAÇÃO ESPELHO - SANTER")
  --   * 47536b14-e7d4-47ce-9477-5fd92a6dacd4 -> 'Douglas Fabrin (Reinaldo)' (caixa "DOUGLAS - ASSISTENCIA - REINALDO")
  --   * 15ed9225-ac37-498c-9a7d-94dac2f5ddae -> 'Guilherme (Reposição)' (caixa "GUILHERME - REPOSIÇÃO DE MATERIAL")
  --   * f95fa987-2fcb-45aa-b72b-a872756e592a -> 'Elemar / Roberto (Reposição)' (caixas "ELEMAR - REPOSIÇÃO" e "ROBERTO - REPOSIÇÃO")
  --   * Demais clientes com alguma referência residual -> nome descritivo 'Cliente em Cadastro (ID)'
  -- - Clientes "Novo Cliente" 100% órfãos (sem nenhuma referência em nenhuma tabela):
  --   remover clientes e seus leads automáticos de placeholder
  -- =========================================================================

  -- Renomeações pontuais com evidência documentada:
  UPDATE public.clientes
  SET nome = 'Ajuste de Estoque - Almoxarifado', atualizado_em = NOW()
  WHERE id = 'f42547b1-3e6f-42fe-919d-f18b2b429425'::uuid;

  UPDATE public.clientes
  SET nome = 'Apto Brooklyn (Santer)', atualizado_em = NOW()
  WHERE id = '8942e8f1-983f-42a8-bcfa-09d7c99c3584'::uuid;

  UPDATE public.clientes
  SET nome = 'Douglas Fabrin (Santer)', atualizado_em = NOW()
  WHERE id = '7d428c26-2e43-4e89-9d84-a7a02b67e661'::uuid;

  UPDATE public.clientes
  SET nome = 'Douglas Fabrin (Reinaldo)', atualizado_em = NOW()
  WHERE id = '47536b14-e7d4-47ce-9477-5fd92a6dacd4'::uuid;

  UPDATE public.clientes
  SET nome = 'Guilherme (Reposição)', atualizado_em = NOW()
  WHERE id = '15ed9225-ac37-498c-9a7d-94dac2f5ddae'::uuid;

  UPDATE public.clientes
  SET nome = 'Elemar / Roberto (Reposição)', atualizado_em = NOW()
  WHERE id = 'f95fa987-2fcb-45aa-b72b-a872756e592a'::uuid;

  -- Para os leads correspondentes dos clientes renomeados, atualizar também o nome
  UPDATE public.leads l
  SET nome = c.nome, atualizado_em = NOW()
  FROM public.clientes c
  WHERE c.lead_id = l.id
    AND c.id IN (
      'f42547b1-3e6f-42fe-919d-f18b2b429425'::uuid,
      '8942e8f1-983f-42a8-bcfa-09d7c99c3584'::uuid,
      '7d428c26-2e43-4e89-9d84-a7a02b67e661'::uuid,
      '47536b14-e7d4-47ce-9477-5fd92a6dacd4'::uuid,
      '15ed9225-ac37-498c-9a7d-94dac2f5ddae'::uuid,
      'f95fa987-2fcb-45aa-b72b-a872756e592a'::uuid
    )
    AND l.nome ILIKE '%Novo Cliente%';

  -- Clientes com timeline mas sem registros operacionais: a81581c0-73c9-40f6-8f58-2946c6f68fa3 e 044f2ea8-038c-4b70-8b7e-06bbb6fb8653
  -- Limpar timeline de testes órfãos desses 2 clientes para permitir exclusão limpa
  DELETE FROM public.timeline_eventos
  WHERE cliente_id IN (
    SELECT c.id FROM public.clientes c
    WHERE c.nome ILIKE '%Novo Cliente%'
      AND NOT EXISTS (SELECT 1 FROM public.formulario_comercial WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.contas_receber WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.contas_pagar WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.produtos_servicos_projeto WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.documentos_cliente WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.estoque_alocacoes WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.estoque_caixas WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.dossies WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.envelopes_assinatura WHERE cliente_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM public.assinaturas WHERE cliente_id = c.id)
  );

  -- Agora deletar os clientes "Novo Cliente" puramente órfãos (sem qualquer documento, caixa, conta, formulário)
  -- Guardar os lead_ids órfãos para remoção em cascata dos leads gerados
  DELETE FROM public.clientes c
  WHERE c.nome ILIKE '%Novo Cliente%'
    AND NOT EXISTS (SELECT 1 FROM public.formulario_comercial WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.contas_receber WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.contas_pagar WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.produtos_servicos_projeto WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.documentos_cliente WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.estoque_alocacoes WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.estoque_caixas WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.dossies WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.envelopes_assinatura WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.assinaturas WHERE cliente_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM public.timeline_eventos WHERE cliente_id = c.id);

  -- Remover leads órfãos gerados automaticamente pelo fluxo "Novo Cliente"
  DELETE FROM public.leads l
  WHERE l.nome ILIKE '%Novo Cliente%'
    AND NOT EXISTS (SELECT 1 FROM public.clientes c WHERE c.lead_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM public.formulario_comercial fc WHERE fc.lead_id = l.id);

  -- =========================================================================
  -- (4) CORRIGIR AS 2 CONTAS A RECEBER COM STATUS 'pago' SEM DATA_PAGAMENTO
  -- Regra: Preencher data_pagamento com a data_vencimento da parcela
  -- (ou data de criação caso vencimento seja nulo)
  -- =========================================================================
  UPDATE public.contas_receber
  SET data_pagamento = COALESCE(data_vencimento, criado_em::date),
      atualizado_em = NOW()
  WHERE lower(status_pagamento) = 'pago' AND data_pagamento IS NULL;

  -- =========================================================================
  -- (4.1) CORRIGIR ALOCAÇÃO DE ESTOQUE EXCEDENTE
  -- Item com alocação ativa superior ao saldo físico em estoque
  -- Ajustar a quantidade alocada para não exceder o saldo real disponível
  -- =========================================================================
  UPDATE public.estoque_alocacoes ea
  SET quantidade = ei.quantidade,
      valor_total_congelado = CASE 
        WHEN ea.valor_unitario_congelado IS NOT NULL THEN (ei.quantidade * ea.valor_unitario_congelado)
        ELSE ea.valor_total_congelado
      END
  FROM public.estoque_itens ei
  WHERE ea.item_id = ei.id
    AND ea.status = 'ativo'
    AND ea.quantidade > ei.quantidade
    AND ei.quantidade >= 0;

END $$;

-- =========================================================================
-- (5) ENDURECER O GATILHO handle_new_user()
-- Impede criação de perfil/usuário automático para signups públicos aleatórios
-- Só permite se criado por Service Role ou por usuário com papel Admin na Matriz
-- Se for signup anônimo/externo, recusa e impede o registro indevido
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role text;
  v_is_admin boolean := false;
  v_caller_uid uuid;
BEGIN
  -- Identifica o papel do JWT da sessão que está disparando a inserção
  BEGIN
    v_role := auth.jwt()->>'role';
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;
  
  -- Se foi chamado pelo backend / Edge Function com service_role, ou pelo script de migrations / admin API
  IF v_role = 'service_role' OR current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    INSERT INTO public.users (id, email, nome, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      nome = EXCLUDED.nome;
    RETURN NEW;
  END IF;

  -- Se foi disparado por um usuário autenticado (ex.: Admin logado convidando/criando)
  BEGIN
    v_caller_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_caller_uid := NULL;
  END;

  IF v_caller_uid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.matriz_permissoes
      WHERE usuario_id = v_caller_uid
        AND modulo IN ('Usuários', 'Gestão de Pessoas')
        AND nivel_acesso IN ('Admin', 'Editor')
    ) INTO v_is_admin;

    IF v_is_admin THEN
      INSERT INTO public.users (id, email, nome, status)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        true
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        nome = EXCLUDED.nome;
      RETURN NEW;
    END IF;
  END IF;

  -- Se for um auto-cadastro público não autorizado:
  -- Bloqueia a inserção do usuário com erro explícito de segurança
  RAISE EXCEPTION 'Auto-cadastro público desativado. Novos usuários devem ser convidados por um administrador.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-garante a ativação do gatilho
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
