-- READ-ONLY DIAGNOSTIC for client Diego (diegofleury@hotmail.com).
-- STRICTLY READ-ONLY: contains ONLY SELECT statements and RAISE NOTICE output.
-- No INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or TRUNCATE.
-- Safe to run multiple times — no side effects, no mutations.
-- Purpose: produce a complete, honest picture of the current post-impact state
-- for Diego across all related modules, so the team can report back before any
-- corrective action is proposed or executed.

DO $$
DECLARE
  v_email text := 'diegofleury@hotmail.com';
  v_survivor_name text := 'DIEGO DE ALBUQUERQUE FLEURY GUIMARAES';
  v_cliente_id uuid;
  v_cliente_nome text;
  v_cliente_excluido boolean;
  v_total_client_records int;
  v_active_client_records int;
  v_excluded_client_records int;

  v_form_total int;
  v_form_with_products int;
  v_form_with_valor_total int;
  v_form_empty_products int;

  v_dossie_total int;
  v_dossie_orphan int;

  v_doc_total int;
  v_doc_with_projeto int;
  v_doc_orphan int;

  v_cr_total int;
  v_cr_orphan int;

  v_psp_total int;
  v_psp_orphan int;
  v_psp_excluido int;
  v_psp_arquivado int;

  v_aloc_total int;

  v_pag_total int;
  v_pag_orphan int;
  v_parcelas_total int;
  v_parcelas_orphan int;

  v_orphan_form_refs int;
  rec RECORD;
BEGIN
  RAISE NOTICE '================================================================';
  RAISE NOTICE ' DIEGO — FULL READ-ONLY DIAGNOSTIC (NO MUTATIONS)';
  RAISE NOTICE ' Generated: 2026-08-12T16:39:04Z';
  RAISE NOTICE ' Email: %', v_email;
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 0: CLIENT RECORDS (incl. duplicates / soft-deleted)
  ----------------------------------------------------------------
  SELECT count(*) INTO v_total_client_records
  FROM public.clientes WHERE email = v_email;

  SELECT count(*) INTO v_active_client_records
  FROM public.clientes
  WHERE email = v_email AND COALESCE(excluido, false) = false;

  SELECT count(*) INTO v_excluded_client_records
  FROM public.clientes
  WHERE email = v_email AND COALESCE(excluido, true) = true;

  RAISE NOTICE '--- CLIENT RECORDS (total: %, active: %, excluded: %) ---',
    v_total_client_records, v_active_client_records, v_excluded_client_records;

  FOR rec IN
    SELECT id, nome, COALESCE(excluido, false) AS excluido, cpf, telefone,
           lead_id, usuario_id, criado_em
    FROM public.clientes
    WHERE email = v_email
    ORDER BY (nome = v_survivor_name)::int DESC, criado_em ASC
  LOOP
    RAISE NOTICE '  Cliente: % | nome: % | excluido: % | cpf: % | tel: % | lead: % | user: % | created: %',
      rec.id, rec.nome, rec.excluido, rec.cpf, rec.telefone, rec.lead_id, rec.usuario_id, rec.criado_em;
  END LOOP;

  -- Canonical (active, survivor) client used for the rest of the diagnostic
  SELECT id, nome, COALESCE(excluido, false) INTO v_cliente_id, v_cliente_nome, v_cliente_excluido
  FROM public.clientes
  WHERE email = v_email AND COALESCE(excluido, false) = false
  ORDER BY (nome = v_survivor_name)::int DESC, criado_em ASC
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE 'WARNING: No active client record for %. Using most recent excluded record for diagnostics.', v_email;
    SELECT id, nome, COALESCE(excluido, false) INTO v_cliente_id, v_cliente_nome, v_cliente_excluido
    FROM public.clientes
    WHERE email = v_email
    ORDER BY (nome = v_survivor_name)::int DESC, criado_em ASC
    LIMIT 1;
  END IF;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE 'ERROR: No client record found at all for %. Aborting diagnostic.', v_email;
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Canonical client for module diagnostics: % | nome: % | excluido: %',
    v_cliente_id, v_cliente_nome, v_cliente_excluido;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 1: FORMULÁRIOS COMERCIAIS
  ----------------------------------------------------------------
  SELECT count(*) INTO v_form_total
  FROM public.formulario_comercial WHERE cliente_id = v_cliente_id;

  SELECT count(*) INTO v_form_with_products
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id
    AND produtos_servicos IS NOT NULL
    AND jsonb_typeof(produtos_servicos) = 'array'
    AND jsonb_array_length(produtos_servicos) > 0;

  SELECT count(*) INTO v_form_with_valor_total
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id AND valor_total IS NOT NULL;

  SELECT count(*) INTO v_form_empty_products
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id
    AND (produtos_servicos IS NULL
         OR jsonb_typeof(produtos_servicos) <> 'array'
         OR jsonb_array_length(produtos_servicos) = 0);

  RAISE NOTICE '--- FORMULÁRIOS COMERCIAIS (total: %, with products: %, with valor_total: %, empty products: %) ---',
    v_form_total, v_form_with_products, v_form_with_valor_total, v_form_empty_products;

  FOR rec IN
    SELECT f.id, f.lead_id, f.valor_total, f.desconto, f.criado_em, f.user_id,
           f.etapa_atual, f.status_analise_projeto, f.arquivado, f.arquivado_analise,
           CASE
             WHEN f.produtos_servicos IS NOT NULL
               AND jsonb_typeof(f.produtos_servicos) = 'array'
               AND jsonb_array_length(f.produtos_servicos) > 0
             THEN 'FILLED' ELSE 'EMPTY'
           END AS products_state,
           (SELECT count(*) FROM public.dossies d WHERE d.formulario_comercial_id = f.id) AS dossie_count,
           (SELECT count(*) FROM public.documentos_cliente dc WHERE dc.projeto_id = f.id) AS doc_count,
           (SELECT count(*) FROM public.contas_receber cr WHERE cr.formulario_comercial_id = f.id) AS cr_count,
           (SELECT count(*) FROM public.produtos_servicos_projeto psp WHERE psp.formulario_comercial_id = f.id) AS psp_count,
           (SELECT count(*) FROM public.pagamentos p WHERE p.formulario_id = f.id) AS pag_count,
           (SELECT count(*) FROM public.alocacao_montagem am
              JOIN public.produtos_servicos_projeto psp2 ON psp2.id = am.card_id
              WHERE psp2.formulario_comercial_id = f.id) AS aloc_count
    FROM public.formulario_comercial f
    WHERE f.cliente_id = v_cliente_id
    ORDER BY f.criado_em ASC
  LOOP
    RAISE NOTICE '  Form: % | lead: % | valor_total: % | desconto: % | etapa: % | status_analise: % | arq: %/% | products: % | created: %',
      rec.id, rec.lead_id, rec.valor_total, rec.desconto, rec.etapa_atual, rec.status_analise_projeto, rec.arquivado, rec.arquivado_analise, rec.products_state, rec.criado_em;
    RAISE NOTICE '    deps -> dossies: % | docs: % | contas_receber: % | psp: % | pagamentos: % | alocacoes: %',
      rec.dossie_count, rec.doc_count, rec.cr_count, rec.psp_count, rec.pag_count, rec.aloc_count;
  END LOOP;

  -- Detect orphaned references (module rows pointing to formulario_comercial ids that no longer exist)
  SELECT count(*) INTO v_orphan_form_refs
  FROM public.contas_receber cr
  LEFT JOIN public.formulario_comercial f ON f.id = cr.formulario_comercial_id
  WHERE cr.cliente_id = v_cliente_id AND cr.formulario_comercial_id IS NOT NULL AND f.id IS NULL;

  SELECT count(*) INTO v_orphan_form_refs
  FROM (
    SELECT cr.id FROM public.contas_receber cr
    LEFT JOIN public.formulario_comercial f ON f.id = cr.formulario_comercial_id
    WHERE cr.cliente_id = v_cliente_id AND cr.formulario_comercial_id IS NOT NULL AND f.id IS NULL
    UNION ALL
    SELECT psp.id FROM public.produtos_servicos_projeto psp
    LEFT JOIN public.formulario_comercial f ON f.id = psp.formulario_comercial_id
    WHERE psp.cliente_id = v_cliente_id AND psp.formulario_comercial_id IS NOT NULL AND f.id IS NULL
    UNION ALL
    SELECT p.id FROM public.pagamentos p
    LEFT JOIN public.formulario_comercial f ON f.id = p.formulario_id
    WHERE p.cliente_id = v_cliente_id AND p.formulario_id IS NOT NULL AND f.id IS NULL
    UNION ALL
    SELECT d.id FROM public.dossies d
    LEFT JOIN public.formulario_comercial f ON f.id = d.formulario_comercial_id
    WHERE d.cliente_id = v_cliente_id AND d.formulario_comercial_id IS NOT NULL AND f.id IS NULL
  ) AS orphans;

  RAISE NOTICE '  [ORPHAN DETECTION] module rows pointing to DELETED formulario_comercial: %', v_orphan_form_refs;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 2: DOSSIÊS
  ----------------------------------------------------------------
  SELECT count(*) INTO v_dossie_total
  FROM public.dossies WHERE cliente_id = v_cliente_id;

  SELECT count(*) INTO v_dossie_orphan
  FROM public.dossies
  WHERE cliente_id = v_cliente_id AND formulario_comercial_id IS NULL;

  RAISE NOTICE '--- DOSSIÊS (total: %, orphan/null form link: %) ---', v_dossie_total, v_dossie_orphan;

  FOR rec IN
    SELECT d.id, d.formulario_comercial_id, d.status, d.criado_em,
           CASE WHEN d.formulario_comercial_id IS NULL THEN 'ORPHAN'
                WHEN NOT EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = d.formulario_comercial_id)
                THEN 'DELETED-FORM-REF'
                ELSE 'LINKED' END AS link_state,
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
    RAISE NOTICE '  Dossie: % | form: % | state: % | status: % | created: % | filled_urls: %',
      rec.id, rec.formulario_comercial_id, rec.link_state, rec.status, rec.criado_em, rec.filled_urls;
  END LOOP;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 3: DOCUMENTOS (documentos_cliente)
  ----------------------------------------------------------------
  SELECT count(*) INTO v_doc_total
  FROM public.documentos_cliente WHERE cliente_id = v_cliente_id;

  SELECT count(*) INTO v_doc_with_projeto
  FROM public.documentos_cliente
  WHERE cliente_id = v_cliente_id AND projeto_id IS NOT NULL;

  SELECT count(*) INTO v_doc_orphan
  FROM public.documentos_cliente
  WHERE cliente_id = v_cliente_id AND projeto_id IS NULL;

  RAISE NOTICE '--- DOCUMENTOS CLIENTE (total: %, with projeto_id: %, orphan/NULL: %) ---',
    v_doc_total, v_doc_with_projeto, v_doc_orphan;

  FOR rec IN
    SELECT dc.id, dc.projeto_id, dc.template_nome, dc.tipo, dc.status, dc.criado_em,
           dc.envelope_id, dc.is_digital,
           (dc.arquivo_url IS NOT NULL)::int AS has_file,
           (dc.arquivo_assinado_url IS NOT NULL)::int AS has_signed,
           CASE WHEN dc.projeto_id IS NULL THEN 'ORPHAN'
                WHEN NOT EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = dc.projeto_id)
                THEN 'DELETED-PROJETO-REF'
                ELSE 'LINKED' END AS link_state
    FROM public.documentos_cliente dc
    WHERE dc.cliente_id = v_cliente_id
    ORDER BY dc.criado_em ASC
  LOOP
    RAISE NOTICE '  Doc: % | projeto: % | state: % | template: % | tipo: % | status: % | digital: % | file: % | signed: % | created: %',
      rec.id, rec.projeto_id, rec.link_state, rec.template_nome, rec.tipo, rec.status, rec.is_digital, rec.has_file, rec.has_signed, rec.criado_em;
  END LOOP;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 4: CONTAS A RECEBER
  ----------------------------------------------------------------
  SELECT count(*) INTO v_cr_total
  FROM public.contas_receber WHERE cliente_id = v_cliente_id;

  SELECT count(*) INTO v_cr_orphan
  FROM public.contas_receber
  WHERE cliente_id = v_cliente_id AND formulario_comercial_id IS NULL;

  RAISE NOTICE '--- CONTAS A RECEBER (total: %, orphan/NULL form link: %) ---', v_cr_total, v_cr_orphan;

  FOR rec IN
    SELECT cr.id, cr.formulario_comercial_id, cr.numero_parcela, cr.valor,
           cr.status_pagamento, cr.data_vencimento, cr.data_pagamento, cr.criado_em,
           CASE WHEN cr.formulario_comercial_id IS NULL THEN 'ORPHAN'
                WHEN NOT EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = cr.formulario_comercial_id)
                THEN 'DELETED-FORM-REF'
                ELSE 'LINKED' END AS link_state
    FROM public.contas_receber cr
    WHERE cr.cliente_id = v_cliente_id
    ORDER BY cr.criado_em ASC
  LOOP
    RAISE NOTICE '  CR: % | form: % | state: % | parcela: % | valor: % | status: % | venc: % | pago: % | created: %',
      rec.id, rec.formulario_comercial_id, rec.link_state, rec.numero_parcela, rec.valor, rec.status_pagamento, rec.data_vencimento, rec.data_pagamento, rec.criado_em;
  END LOOP;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 5: ITENS DE ANÁLISE/PRODUÇÃO/MONTAGEM (produtos_servicos_projeto)
  ----------------------------------------------------------------
  SELECT count(*) INTO v_psp_total
  FROM public.produtos_servicos_projeto WHERE cliente_id = v_cliente_id;

  SELECT count(*) INTO v_psp_orphan
  FROM public.produtos_servicos_projeto
  WHERE cliente_id = v_cliente_id AND formulario_comercial_id IS NULL;

  SELECT count(*) INTO v_psp_excluido
  FROM public.produtos_servicos_projeto
  WHERE cliente_id = v_cliente_id
    AND (COALESCE(excluido_analise, false) OR COALESCE(excluido_producao, false) OR COALESCE(excluido_montagem, false));

  SELECT count(*) INTO v_psp_arquivado
  FROM public.produtos_servicos_projeto
  WHERE cliente_id = v_cliente_id
    AND (COALESCE(arquivado_analise, false) OR COALESCE(arquivado_producao, false) OR COALESCE(arquivado_montagem, false));

  RAISE NOTICE '--- PRODUTOS/SERVIÇOS PROJETO (total: %, orphan/NULL form: %, any excluido_*: %, any arquivado_*: %) ---',
    v_psp_total, v_psp_orphan, v_psp_excluido, v_psp_arquivado;

  FOR rec IN
    SELECT psp.id, psp.formulario_comercial_id, psp.nome_produto, psp.status_analise,
           psp.codigo_rastreio, psp.criado_em, psp.analista_id,
           psp.excluido_analise, psp.excluido_producao, psp.excluido_montagem,
           psp.arquivado_analise, psp.arquivado_producao, psp.arquivado_montagem,
           psp.is_outsourced, psp.terceirizado_validado,
           (SELECT count(*) FROM public.alocacao_montagem am WHERE am.card_id = psp.id) AS aloc_count,
           CASE WHEN psp.formulario_comercial_id IS NULL THEN 'ORPHAN'
                WHEN NOT EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = psp.formulario_comercial_id)
                THEN 'DELETED-FORM-REF'
                ELSE 'LINKED' END AS link_state
    FROM public.produtos_servicos_projeto psp
    WHERE psp.cliente_id = v_cliente_id
    ORDER BY psp.criado_em ASC
  LOOP
    RAISE NOTICE '  PSP: % | form: % | state: % | nome: % | status: % | rastreio: % | outsourced: %/% | created: %',
      rec.id, rec.formulario_comercial_id, rec.link_state, rec.nome_produto, rec.status_analise, rec.codigo_rastreio, rec.is_outsourced, rec.terceirizado_validado, rec.criado_em;
    RAISE NOTICE '    excl: a=%/p=%/m=% | arq: a=%/p=%/m=% | alocacoes: %',
      rec.excluido_analise, rec.excluido_producao, rec.excluido_montagem,
      rec.arquivado_analise, rec.arquivado_producao, rec.arquivado_montagem, rec.aloc_count;
  END LOOP;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 6: ALOCAÇÕES DE MONTAGEM
  ----------------------------------------------------------------
  SELECT count(*) INTO v_aloc_total
  FROM public.alocacao_montagem am
  JOIN public.produtos_servicos_projeto psp ON psp.id = am.card_id
  WHERE psp.cliente_id = v_cliente_id;

  RAISE NOTICE '--- ALOCAÇÕES DE MONTAGEM (total: %) ---', v_aloc_total;

  FOR rec IN
    SELECT am.id, am.card_id, am.montador_id, am.criado_em,
           psp.formulario_comercial_id, psp.nome_produto,
           m.nome_completo AS montador_nome,
           CASE WHEN psp.formulario_comercial_id IS NULL THEN 'ORPHAN'
                WHEN NOT EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = psp.formulario_comercial_id)
                THEN 'DELETED-FORM-REF'
                ELSE 'LINKED' END AS link_state
    FROM public.alocacao_montagem am
    JOIN public.produtos_servicos_projeto psp ON psp.id = am.card_id
    LEFT JOIN public.montadores m ON m.id = am.montador_id
    WHERE psp.cliente_id = v_cliente_id
    ORDER BY am.criado_em ASC
  LOOP
    RAISE NOTICE '  Aloc: % | card: % | form: % | state: % | montador: % (%) | nome: % | created: %',
      rec.id, rec.card_id, rec.formulario_comercial_id, rec.link_state, rec.montador_id, rec.montador_nome, rec.nome_produto, rec.criado_em;
  END LOOP;

  -- Also detect any alocacao_montagem whose card_id no longer exists (truly lost)
  FOR rec IN
    SELECT am.id, am.card_id, am.montador_id, am.criado_em
    FROM public.alocacao_montagem am
    LEFT JOIN public.produtos_servicos_projeto psp ON psp.id = am.card_id
    WHERE psp.id IS NULL
      AND EXISTS (
        SELECT 1 FROM public.produtos_servicos_projeto old_psp
        WHERE old_psp.id = am.card_id
          AND old_psp.cliente_id = v_cliente_id
      )
  LOOP
    RAISE NOTICE '  [LOST] Aloc: % | card: % (card no longer exists) | montador: % | created: %',
      rec.id, rec.card_id, rec.montador_id, rec.criado_em;
  END LOOP;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 7: PAGAMENTOS & PARCELAS
  ----------------------------------------------------------------
  SELECT count(*) INTO v_pag_total
  FROM public.pagamentos WHERE cliente_id = v_cliente_id;

  SELECT count(*) INTO v_pag_orphan
  FROM public.pagamentos
  WHERE cliente_id = v_cliente_id AND formulario_id IS NULL;

  RAISE NOTICE '--- PAGAMENTOS (total: %, orphan/NULL form link: %) ---', v_pag_total, v_pag_orphan;

  FOR rec IN
    SELECT p.id, p.formulario_id, p.forma_pagamento, p.valor_total, p.numero_parcelas,
           p.data_primeira_parcela, p.data_pagamento, p.meio_pagamento, p.tipo_pagamento, p.criado_em,
           CASE WHEN p.formulario_id IS NULL THEN 'ORPHAN'
                WHEN NOT EXISTS (SELECT 1 FROM public.formulario_comercial f WHERE f.id = p.formulario_id)
                THEN 'DELETED-FORM-REF'
                ELSE 'LINKED' END AS link_state,
           (SELECT count(*) FROM public.parcelas par WHERE par.pagamento_id = p.id) AS parcela_count
    FROM public.pagamentos p
    WHERE p.cliente_id = v_cliente_id
    ORDER BY p.criado_em ASC
  LOOP
    RAISE NOTICE '  Pag: % | form: % | state: % | forma: % | valor: % | parcelas: % | meio: % | tipo: % | 1a: % | pago: % | created: %',
      rec.id, rec.formulario_id, rec.link_state, rec.forma_pagamento, rec.valor_total, rec.numero_parcelas, rec.meio_pagamento, rec.tipo_pagamento, rec.data_primeira_parcela, rec.data_pagamento, rec.criado_em;
    RAISE NOTICE '    parcelas_linked: %', rec.parcela_count;
  END LOOP;

  -- Parcelas diagnostics
  SELECT count(*) INTO v_parcelas_total
  FROM public.parcelas par
  JOIN public.pagamentos p ON p.id = par.pagamento_id
  WHERE p.cliente_id = v_cliente_id;

  SELECT count(*) INTO v_parcelas_orphan
  FROM public.parcelas par
  LEFT JOIN public.pagamentos p ON p.id = par.pagamento_id
  WHERE p.id IS NULL OR p.cliente_id IS DISTINCT FROM v_cliente_id;

  RAISE NOTICE '--- PARCELAS (linked to Diego pagamentos: %, orphan/lost: %) ---',
    v_parcelas_total, v_parcelas_orphan;

  FOR rec IN
    SELECT par.id, par.pagamento_id, par.numero, par.numero_parcela, par.valor, par.valor_parcela,
           par.status, par.data_vencimento, par.meio_pagamento, par.criado_em,
           p.formulario_id
    FROM public.parcelas par
    JOIN public.pagamentos p ON p.id = par.pagamento_id
    WHERE p.cliente_id = v_cliente_id
    ORDER BY par.criado_em ASC
  LOOP
    RAISE NOTICE '  Parcela: % | pagamento: % | form: % | num: %/% | valor: %/% | status: % | venc: % | meio: % | created: %',
      rec.id, rec.pagamento_id, rec.formulario_id, rec.numero, rec.numero_parcela, rec.valor, rec.valor_parcela, rec.status, rec.data_vencimento, rec.meio_pagamento, rec.criado_em;
  END LOOP;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 8: STORAGE OBJECTS (read-only count)
  ----------------------------------------------------------------
  RAISE NOTICE '--- STORAGE OBJECTS (read-only count by bucket for Diego client prefix) ---';
  FOR rec IN
    SELECT bucket_id, count(*) AS obj_count
    FROM storage.objects
    WHERE bucket_id IN ('bender_clientes', 'dossiers')
      AND (name LIKE v_cliente_id::text || '/%' OR name LIKE '%' || v_cliente_id::text || '%')
    GROUP BY bucket_id
  LOOP
    RAISE NOTICE '  Bucket: % | objects referencing client id: %', rec.bucket_id, rec.obj_count;
  END LOOP;
  RAISE NOTICE '';

  ----------------------------------------------------------------
  -- SECTION 9: SUMMARY — what exists / what was lost / recoverable
  ----------------------------------------------------------------
  RAISE NOTICE '================================================================';
  RAISE NOTICE ' DIAGNOSTIC SUMMARY — Diego (cliente: %)', v_cliente_id;
  RAISE NOTICE '================================================================';
  RAISE NOTICE ' Client records: total=%, active=%, excluded=%', v_total_client_records, v_active_client_records, v_excluded_client_records;
  RAISE NOTICE ' Formulários comerciais: total=% (with products=%, with valor_total=%, empty=%)',
    v_form_total, v_form_with_products, v_form_with_valor_total, v_form_empty_products;
  RAISE NOTICE '   └─ orphan module refs to DELETED forms: %', v_orphan_form_refs;
  RAISE NOTICE ' Dossiês: total=% (orphan/null form link=%)', v_dossie_total, v_dossie_orphan;
  RAISE NOTICE ' Documentos: total=% (with projeto_id=%, orphan/NULL=%)', v_doc_total, v_doc_with_projeto, v_doc_orphan;
  RAISE NOTICE ' Contas a receber: total=% (orphan/NULL form link=%)', v_cr_total, v_cr_orphan;
  RAISE NOTICE ' Produtos/serviços projeto: total=% (orphan/NULL form=%, excluido_*=%, arquivado_*=%)',
    v_psp_total, v_psp_orphan, v_psp_excluido, v_psp_arquivado;
  RAISE NOTICE ' Alocações de montagem: total=%', v_aloc_total;
  RAISE NOTICE ' Pagamentos: total=% (orphan/NULL form link=%)', v_pag_total, v_pag_orphan;
  RAISE NOTICE ' Parcelas: linked=%, orphan/lost=%', v_parcelas_total, v_parcelas_orphan;
  RAISE NOTICE '================================================================';
  RAISE NOTICE ' READ-ONLY DIAGNOSTIC COMPLETE — no data was modified.';
  RAISE NOTICE ' Review the above before proposing any corrective action.';
  RAISE NOTICE '================================================================';
END $$;
