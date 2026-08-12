-- READ-ONLY DIAGNOSTIC for Diego data integrity.
-- This migration ONLY runs SELECT queries and reports results via RAISE NOTICE.
-- No ALTER, no DELETE, no UPDATE — pure diagnostic.
-- Must run BEFORE any corrective migration.

DO $$
DECLARE
  v_cliente_id uuid;
  v_email text := 'diegofleury@hotmail.com';
  v_survivor_name text := 'DIEGO DE ALBUQUERQUE FLEURY GUIMARAES';
  v_form_count int;
  v_dossie_count int;
  v_doc_total int;
  v_doc_orphan int;
  v_doc_with_project int;
  v_cr_count int;
  v_psp_count int;
  v_aloc_count int;
  v_pagamentos_count int;
  rec RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE ' DIEGO DATA INTEGRITY DIAGNOSTIC';
  RAISE NOTICE '========================================';

  -- Step 1: Locate Diego's canonical client record
  SELECT id INTO v_cliente_id
  FROM public.clientes
  WHERE email = v_email
    AND COALESCE(excluido, false) = false
  ORDER BY
    (nome = v_survivor_name)::int DESC,
    criado_em ASC
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE 'WARNING: No active client record found for email %. Checking excluded records.', v_email;
    SELECT id INTO v_cliente_id
    FROM public.clientes
    WHERE email = v_email
    ORDER BY criado_em ASC
    LIMIT 1;
    IF v_cliente_id IS NULL THEN
      RAISE NOTICE 'ERROR: No client record at all for email %. Aborting diagnostic.', v_email;
      RETURN;
    END IF;
  END IF;

  RAISE NOTICE 'Cliente ID: %', v_cliente_id;
  RAISE NOTICE '';

  -- Step 2: Report formulario_comercial records
  SELECT count(*) INTO v_form_count
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id;

  RAISE NOTICE '--- formulario_comercial (total: %) ---', v_form_count;

  FOR rec IN
    SELECT
      f.id,
      f.lead_id,
      f.valor_total,
      f.criado_em,
      f.desconto,
      CASE
        WHEN f.produtos_servicos IS NOT NULL
          AND jsonb_typeof(f.produtos_servicos) = 'array'
          AND jsonb_array_length(f.produtos_servicos) > 0
        THEN 'FILLED'
        ELSE 'EMPTY'
      END AS products_state,
      (SELECT count(*) FROM public.dossies d WHERE d.formulario_comercial_id = f.id) AS dossie_count,
      (SELECT count(*) FROM public.documentos_cliente dc WHERE dc.projeto_id = f.id) AS doc_count,
      (SELECT count(*) FROM public.contas_receber cr WHERE cr.formulario_comercial_id = f.id) AS cr_count,
      (SELECT count(*) FROM public.produtos_servicos_projeto psp WHERE psp.formulario_comercial_id = f.id) AS psp_count,
      (SELECT count(*) FROM public.pagamentos p WHERE p.formulario_id = f.id) AS pag_count
    FROM public.formulario_comercial f
    WHERE f.cliente_id = v_cliente_id
    ORDER BY f.criado_em ASC
  LOOP
    RAISE NOTICE '  Form: %', rec.id;
    RAISE NOTICE '    lead_id: % | valor_total: % | desconto: % | created: %', rec.lead_id, rec.valor_total, rec.desconto, rec.criado_em;
    RAISE NOTICE '    products: % | dossies: % | docs: % | contas_receber: % | psp: % | pagamentos: %',
      rec.products_state, rec.dossie_count, rec.doc_count, rec.cr_count, rec.psp_count, rec.pag_count;
  END LOOP;
  RAISE NOTICE '';

  -- Step 3: Report dossies
  SELECT count(*) INTO v_dossie_count
  FROM public.dossies
  WHERE cliente_id = v_cliente_id;

  RAISE NOTICE '--- dossies (total: %) ---', v_dossie_count;

  FOR rec IN
    SELECT
      d.id,
      d.formulario_comercial_id,
      d.status,
      d.criado_em,
      CASE WHEN d.formulario_comercial_id IS NULL THEN 'ORPHAN' ELSE 'LINKED' END AS link_state,
      (d.contrato_url IS NOT NULL)::int +
      (d.termo_conclusao_url IS NOT NULL)::int +
      (d.termo_garantia_url IS NOT NULL)::int +
      (d.ata_reuniao_url IS NOT NULL)::int +
      (d.caderno_tecnico_url IS NOT NULL)::int +
      (d.renders_url IS NOT NULL)::int +
      (d.arquivo_projeto_url IS NOT NULL)::int +
      (d.drafts_medida_url IS NOT NULL)::int AS filled_urls
    FROM public.dossies d
    WHERE d.cliente_id = v_cliente_id
    ORDER BY d.criado_em ASC
  LOOP
    RAISE NOTICE '  Dossie: % | form: % | status: % | created: % | state: % | filled_urls: %',
      rec.id, rec.formulario_comercial_id, rec.status, rec.criado_em, rec.link_state, rec.filled_urls;
  END LOOP;
  RAISE NOTICE '';

  -- Step 4: Report documentos_cliente
  SELECT count(*) INTO v_doc_total
  FROM public.documentos_cliente
  WHERE cliente_id = v_cliente_id;

  SELECT count(*) INTO v_doc_orphan
  FROM public.documentos_cliente
  WHERE cliente_id = v_cliente_id
    AND projeto_id IS NULL;

  SELECT count(*) INTO v_doc_with_project
  FROM public.documentos_cliente
  WHERE cliente_id = v_cliente_id
    AND projeto_id IS NOT NULL;

  RAISE NOTICE '--- documentos_cliente (total: %, with projeto_id: %, orphan: %) ---',
    v_doc_total, v_doc_with_project, v_doc_orphan;

  FOR rec IN
    SELECT
      dc.id,
      dc.projeto_id,
      dc.template_nome,
      dc.tipo,
      dc.status,
      dc.criado_em,
      CASE WHEN dc.projeto_id IS NULL THEN 'ORPHAN' ELSE 'LINKED' END AS link_state,
      (dc.arquivo_url IS NOT NULL)::int AS has_file,
      (dc.arquivo_assinado_url IS NOT NULL)::int AS has_signed
    FROM public.documentos_cliente dc
    WHERE dc.cliente_id = v_cliente_id
    ORDER BY dc.criado_em ASC
  LOOP
    RAISE NOTICE '  Doc: % | projeto: % | state: % | template: % | tipo: % | status: % | created: % | file: % | signed: %',
      rec.id, rec.projeto_id, rec.link_state, rec.template_nome, rec.tipo, rec.status, rec.criado_em, rec.has_file, rec.has_signed;
  END LOOP;
  RAISE NOTICE '';

  -- Step 5: Report contas_receber
  SELECT count(*) INTO v_cr_count
  FROM public.contas_receber
  WHERE cliente_id = v_cliente_id;

  RAISE NOTICE '--- contas_receber (total: %) ---', v_cr_count;

  FOR rec IN
    SELECT
      cr.id,
      cr.formulario_comercial_id,
      cr.numero_parcela,
      cr.valor,
      cr.status_pagamento,
      cr.data_vencimento,
      cr.criado_em,
      CASE WHEN cr.formulario_comercial_id IS NULL THEN 'ORPHAN' ELSE 'LINKED' END AS link_state
    FROM public.contas_receber cr
    WHERE cr.cliente_id = v_cliente_id
    ORDER BY cr.criado_em ASC
  LOOP
    RAISE NOTICE '  CR: % | form: % | state: % | parcela: % | valor: % | status: % | venc: % | created: %',
      rec.id, rec.formulario_comercial_id, rec.link_state, rec.numero_parcela, rec.valor, rec.status_pagamento, rec.data_vencimento, rec.criado_em;
  END LOOP;
  RAISE NOTICE '';

  -- Step 6: Report produtos_servicos_projeto (Análise/Produção/Montagem)
  SELECT count(*) INTO v_psp_count
  FROM public.produtos_servicos_projeto
  WHERE cliente_id = v_cliente_id;

  RAISE NOTICE '--- produtos_servicos_projeto (total: %) ---', v_psp_count;

  FOR rec IN
    SELECT
      psp.id,
      psp.formulario_comercial_id,
      psp.nome_produto,
      psp.status_analise,
      psp.codigo_rastreio,
      psp.criado_em,
      psp.excluido_analise,
      psp.excluido_producao,
      psp.excluido_montagem,
      psp.arquivado_analise,
      psp.arquivado_producao,
      psp.arquivado_montagem,
      (SELECT count(*) FROM public.alocacao_montagem am WHERE am.card_id = psp.id) AS aloc_count
    FROM public.produtos_servicos_projeto psp
    WHERE psp.cliente_id = v_cliente_id
    ORDER BY psp.criado_em ASC
  LOOP
    RAISE NOTICE '  PSP: % | form: % | nome: % | status: % | rastreio: % | created: %',
      rec.id, rec.formulario_comercial_id, rec.nome_produto, rec.status_analise, rec.codigo_rastreio, rec.criado_em;
    RAISE NOTICE '    excl_analise: % | excl_prod: % | excl_mont: % | arq_analise: % | arq_prod: % | arq_mont: % | aloc: %',
      rec.excluido_analise, rec.excluido_producao, rec.excluido_montagem,
      rec.arquivado_analise, rec.arquivado_producao, rec.arquivado_montagem, rec.aloc_count;
  END LOOP;
  RAISE NOTICE '';

  -- Step 7: Report alocacao_montagem
  SELECT count(*) INTO v_aloc_count
  FROM public.alocacao_montagem am
  INNER JOIN public.produtos_servicos_projeto psp ON psp.id = am.card_id
  WHERE psp.cliente_id = v_cliente_id;

  RAISE NOTICE '--- alocacao_montagem (total: %) ---', v_aloc_count;

  FOR rec IN
    SELECT
      am.id,
      am.card_id,
      am.montador_id,
      am.criado_em,
      psp.formulario_comercial_id,
      psp.nome_produto
    FROM public.alocacao_montagem am
    INNER JOIN public.produtos_servicos_projeto psp ON psp.id = am.card_id
    WHERE psp.cliente_id = v_cliente_id
    ORDER BY am.criado_em ASC
  LOOP
    RAISE NOTICE '  Aloc: % | card: % | form: % | montador: % | nome: % | created: %',
      rec.id, rec.card_id, rec.formulario_comercial_id, rec.montador_id, rec.nome_produto, rec.criado_em;
  END LOOP;
  RAISE NOTICE '';

  -- Step 8: Report pagamentos
  SELECT count(*) INTO v_pagamentos_count
  FROM public.pagamentos
  WHERE cliente_id = v_cliente_id;

  RAISE NOTICE '--- pagamentos (total: %) ---', v_pagamentos_count;

  FOR rec IN
    SELECT
      p.id,
      p.formulario_id,
      p.forma_pagamento,
      p.valor_total,
      p.numero_parcelas,
      p.criado_em,
      CASE WHEN p.formulario_id IS NULL THEN 'ORPHAN' ELSE 'LINKED' END AS link_state
    FROM public.pagamentos p
    WHERE p.cliente_id = v_cliente_id
    ORDER BY p.criado_em ASC
  LOOP
    RAISE NOTICE '  Pag: % | form: % | state: % | forma: % | valor: % | parcelas: % | created: %',
      rec.id, rec.formulario_id, rec.link_state, rec.forma_pagamento, rec.valor_total, rec.numero_parcelas, rec.criado_em;
  END LOOP;
  RAISE NOTICE '';

  -- Step 9: Summary
  RAISE NOTICE '========================================';
  RAISE NOTICE ' DIAGNOSTIC SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  formulario_comercial: %', v_form_count;
  RAISE NOTICE '  dossies: %', v_dossie_count;
  RAISE NOTICE '  documentos_cliente: % (orphan: %)', v_doc_total, v_doc_orphan;
  RAISE NOTICE '  contas_receber: %', v_cr_count;
  RAISE NOTICE '  produtos_servicos_projeto: %', v_psp_count;
  RAISE NOTICE '  alocacao_montagem: %', v_aloc_count;
  RAISE NOTICE '  pagamentos: %', v_pagamentos_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE ' Diagnostic complete. Review above before running repair.';
  RAISE NOTICE '========================================';
END $$;
