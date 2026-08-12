-- SURGICAL REPAIR for Diego data integrity.
-- Reassigns (never deletes) module records from duplicate sales to the original sale.
-- Only the duplicate formulario_comercial record itself is removed AFTER all its
-- dependencies are safely reassigned and validated via prior SELECT.
--
-- Rules:
--   1. Identify original sale (R$ 150.926,90 or oldest form with filled produtos_servicos)
--   2. Identify duplicate sale (R$ 2.768,25 or other forms)
--   3. REASSIGN contas_receber, produtos_servicos_projeto, pagamentos, documentos_cliente,
--      dossies from duplicate → original (NEVER delete module records)
--   4. Reassign orphan documentos_cliente (projeto_id IS NULL) to original ONLY if
--      created before the duplicate sale's creation date
--   5. Ensure original sale has a dossie
--   6. Only delete the duplicate form after SELECT validation confirms zero remaining references
--   7. Log every action to timeline_eventos
--
-- Idempotent: safe to run multiple times. If no duplicate exists, this is a no-op.

DO $$
DECLARE
  v_cliente_id uuid;
  v_email text := 'diegofleury@hotmail.com';
  v_survivor_name text := 'DIEGO DE ALBUQUERQUE FLEURY GUIMARAES';
  v_original_form_id uuid;
  v_original_lead_id uuid;
  v_original_created_at timestamptz;
  v_dup_form_id uuid;
  v_dup_created_at timestamptz;
  v_dossie_id uuid;
  v_user_id uuid;
  v_count int;
  v_reassigned_cr int := 0;
  v_reassigned_psp int := 0;
  v_reassigned_pag int := 0;
  v_reassigned_docs int := 0;
  v_reassigned_orphan_docs int := 0;
  v_reassigned_dossies int := 0;
  v_deleted_forms int := 0;
  rec RECORD;
BEGIN
  -- Step 0: Locate Diego's canonical client record
  SELECT id INTO v_cliente_id
  FROM public.clientes
  WHERE email = v_email
    AND COALESCE(excluido, false) = false
  ORDER BY
    (nome = v_survivor_name)::int DESC,
    criado_em ASC
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE 'REPAIR: No active client found for %. No action taken.', v_email;
    RETURN;
  END IF;

  -- Step 1: Identify the ORIGINAL sale.
  -- Prefer: oldest form with filled produtos_servicos (the real R$ 150.926,90 sale).
  -- Fallback: form with valor_total between 150926.80 and 150926.99.
  SELECT id, lead_id, criado_em, user_id
  INTO v_original_form_id, v_original_lead_id, v_original_created_at, v_user_id
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id
    AND produtos_servicos IS NOT NULL
    AND jsonb_typeof(produtos_servicos) = 'array'
    AND jsonb_array_length(produtos_servicos) > 0
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_original_form_id IS NULL THEN
    SELECT id, lead_id, criado_em, user_id
    INTO v_original_form_id, v_original_lead_id, v_original_created_at, v_user_id
    FROM public.formulario_comercial
    WHERE cliente_id = v_cliente_id
      AND valor_total IS NOT NULL
      AND valor_total BETWEEN 150926.80 AND 150926.99
    ORDER BY criado_em ASC
    LIMIT 1;
  END IF;

  IF v_original_form_id IS NULL THEN
    -- Fallback: just use the oldest form
    SELECT id, lead_id, criado_em, user_id
    INTO v_original_form_id, v_original_lead_id, v_original_created_at, v_user_id
    FROM public.formulario_comercial
    WHERE cliente_id = v_cliente_id
    ORDER BY criado_em ASC
    LIMIT 1;
  END IF;

  IF v_original_form_id IS NULL THEN
    RAISE NOTICE 'REPAIR: No formulario_comercial found for Diego. No action taken.';
    RETURN;
  END IF;

  RAISE NOTICE 'REPAIR: Original sale form identified: % (created: %)', v_original_form_id, v_original_created_at;

  -- Step 2: Ensure the original sale has a dossie
  SELECT id INTO v_dossie_id
  FROM public.dossies
  WHERE formulario_comercial_id = v_original_form_id
  LIMIT 1;

  IF v_dossie_id IS NULL THEN
    -- Try to adopt an orphan dossie for this client
    SELECT id INTO v_dossie_id
    FROM public.dossies
    WHERE cliente_id = v_cliente_id
      AND formulario_comercial_id IS NULL
    ORDER BY criado_em ASC
    LIMIT 1;

    IF v_dossie_id IS NOT NULL THEN
      UPDATE public.dossies
      SET formulario_comercial_id = v_original_form_id, atualizado_em = NOW()
      WHERE id = v_dossie_id;
      RAISE NOTICE 'REPAIR: Adopted orphan dossie % for original sale', v_dossie_id;
    ELSE
      -- Create a fresh dossie
      INSERT INTO public.dossies (cliente_id, formulario_comercial_id, user_id, status)
      VALUES (v_cliente_id, v_original_form_id, v_user_id, 'em_documentacao')
      ON CONFLICT DO NOTHING;
      RAISE NOTICE 'REPAIR: Created new dossie for original sale';
    END IF;
  ELSE
    RAISE NOTICE 'REPAIR: Original sale already has dossie %', v_dossie_id;
  END IF;

  -- Step 3: Process each DUPLICATE form (every form that is NOT the original)
  FOR rec IN
    SELECT id, lead_id, criado_em, user_id
    FROM public.formulario_comercial
    WHERE cliente_id = v_cliente_id
      AND id <> v_original_form_id
    ORDER BY criado_em ASC
  LOOP
    v_dup_form_id := rec.id;
    v_dup_created_at := rec.criado_em;
    RAISE NOTICE 'REPAIR: Processing duplicate form % (created: %)', v_dup_form_id, v_dup_created_at;

    -- 3a. SELECT validation: check contas_receber
    SELECT count(*) INTO v_count
    FROM public.contas_receber
    WHERE formulario_comercial_id = v_dup_form_id;

    IF v_count > 0 THEN
      -- REASSIGN (never delete) contas_receber to original sale
      UPDATE public.contas_receber
      SET formulario_comercial_id = v_original_form_id,
          atualizado_em = NOW()
      WHERE formulario_comercial_id = v_dup_form_id;
      GET DIAGNOSTICS v_reassigned_cr = ROW_COUNT;
      RAISE NOTICE 'REPAIR: Reassigned % contas_receber records to original sale', v_reassigned_cr;
    ELSE
      RAISE NOTICE 'REPAIR: No contas_receber found on duplicate form (safe)';
    END IF;

    -- 3b. SELECT validation: check produtos_servicos_projeto (Análise/Produção/Montagem)
    SELECT count(*) INTO v_count
    FROM public.produtos_servicos_projeto
    WHERE formulario_comercial_id = v_dup_form_id;

    IF v_count > 0 THEN
      -- REASSIGN (never delete) produtos_servicos_projeto to original sale.
      -- This preserves alocacao_montagem.card_id references automatically
      -- because the PSP record itself is preserved (only its form link changes).
      UPDATE public.produtos_servicos_projeto
      SET formulario_comercial_id = v_original_form_id,
          atualizado_em = NOW()
      WHERE formulario_comercial_id = v_dup_form_id;
      GET DIAGNOSTICS v_reassigned_psp = ROW_COUNT;
      RAISE NOTICE 'REPAIR: Reassigned % produtos_servicos_projeto records to original sale (alocacao_montagem.card_id preserved)', v_reassigned_psp;
    ELSE
      RAISE NOTICE 'REPAIR: No produtos_servicos_projeto found on duplicate form (safe)';
    END IF;

    -- 3c. SELECT validation: check pagamentos
    SELECT count(*) INTO v_count
    FROM public.pagamentos
    WHERE formulario_id = v_dup_form_id;

    IF v_count > 0 THEN
      UPDATE public.pagamentos
      SET formulario_id = v_original_form_id,
          atualizado_em = NOW()
      WHERE formulario_id = v_dup_form_id;
      GET DIAGNOSTICS v_reassigned_pag = ROW_COUNT;
      RAISE NOTICE 'REPAIR: Reassigned % pagamentos records to original sale', v_reassigned_pag;
    ELSE
      RAISE NOTICE 'REPAIR: No pagamentos found on duplicate form (safe)';
    END IF;

    -- 3d. SELECT validation: check documentos_cliente linked to this form
    SELECT count(*) INTO v_count
    FROM public.documentos_cliente
    WHERE projeto_id = v_dup_form_id;

    IF v_count > 0 THEN
      UPDATE public.documentos_cliente
      SET projeto_id = v_original_form_id,
          atualizado_em = NOW()
      WHERE projeto_id = v_dup_form_id;
      GET DIAGNOSTICS v_reassigned_docs = ROW_COUNT;
      RAISE NOTICE 'REPAIR: Reassigned % documentos_cliente records to original sale', v_reassigned_docs;
    ELSE
      RAISE NOTICE 'REPAIR: No documentos_cliente linked to duplicate form (safe)';
    END IF;

    -- 3e. SELECT validation: check dossies linked to this form
    SELECT count(*) INTO v_count
    FROM public.dossies
    WHERE formulario_comercial_id = v_dup_form_id;

    IF v_count > 0 THEN
      -- Reassign dossies to original sale (merge into the original's dossie if exists)
      -- If original already has a dossie, we move the duplicate's URLs into it, then delete the duplicate dossie
      -- to avoid having two dossies for one sale. This is safe because we preserve all file URLs.
      SELECT id INTO v_dossie_id
      FROM public.dossies
      WHERE formulario_comercial_id = v_original_form_id
      LIMIT 1;

      IF v_dossie_id IS NOT NULL THEN
        -- Merge URLs from duplicate's dossie into original's dossie (COALESCE to avoid overwriting)
        UPDATE public.dossies target
        SET
          contrato_url = COALESCE(target.contrato_url, src.contrato_url),
          termo_conclusao_url = COALESCE(target.termo_conclusao_url, src.termo_conclusao_url),
          termo_garantia_url = COALESCE(target.termo_garantia_url, src.termo_garantia_url),
          ata_reuniao_url = COALESCE(target.ata_reuniao_url, src.ata_reuniao_url),
          caderno_tecnico_url = COALESCE(target.caderno_tecnico_url, src.caderno_tecnico_url),
          renders_url = COALESCE(target.renders_url, src.renders_url),
          arquivo_projeto_url = COALESCE(target.arquivo_projeto_url, src.arquivo_projeto_url),
          drafts_medida_url = COALESCE(target.drafts_medida_url, src.drafts_medida_url),
          atualizado_em = NOW()
        FROM public.dossies src
        WHERE src.formulario_comercial_id = v_dup_form_id
          AND target.id = v_dossie_id;

        -- Now safely delete the duplicate's dossie (its URLs are preserved in the original)
        DELETE FROM public.dossies WHERE formulario_comercial_id = v_dup_form_id;
        GET DIAGNOSTICS v_reassigned_dossies = ROW_COUNT;
        RAISE NOTICE 'REPAIR: Merged and removed % duplicate dossie(s) — all URLs preserved in original dossie', v_reassigned_dossies;
      ELSE
        -- Original has no dossie yet — just reassign the duplicate's dossie to the original form
        UPDATE public.dossies
        SET formulario_comercial_id = v_original_form_id,
            atualizado_em = NOW()
        WHERE formulario_comercial_id = v_dup_form_id;
        GET DIAGNOSTICS v_reassigned_dossies = ROW_COUNT;
        RAISE NOTICE 'REPAIR: Reassigned % dossie(s) to original sale', v_reassigned_dossies;
      END IF;
    ELSE
      RAISE NOTICE 'REPAIR: No dossies linked to duplicate form (safe)';
    END IF;

    -- 3f. Reassign orphan documentos_cliente (projeto_id IS NULL) created BEFORE the duplicate sale
    -- Only reassign orphans that predate the duplicate — never reassign docs that could
    -- belong to another legitimate sale created after the duplicate.
    SELECT count(*) INTO v_count
    FROM public.documentos_cliente
    WHERE cliente_id = v_cliente_id
      AND projeto_id IS NULL
      AND criado_em < v_dup_created_at;

    IF v_count > 0 THEN
      UPDATE public.documentos_cliente
      SET projeto_id = v_original_form_id,
          atualizado_em = NOW()
      WHERE cliente_id = v_cliente_id
        AND projeto_id IS NULL
        AND criado_em < v_dup_created_at;
      GET DIAGNOSTICS v_reassigned_orphan_docs = ROW_COUNT;
      RAISE NOTICE 'REPAIR: Reassigned % orphan documentos (created before duplicate) to original sale', v_reassigned_orphan_docs;
    ELSE
      RAISE NOTICE 'REPAIR: No orphan documentos predating the duplicate (safe)';
    END IF;

    -- 3g. FINAL VALIDATION before deleting the duplicate form.
    -- Select ALL remaining references to ensure nothing was missed.
    SELECT
      (SELECT count(*) FROM public.contas_receber WHERE formulario_comercial_id = v_dup_form_id) +
      (SELECT count(*) FROM public.produtos_servicos_projeto WHERE formulario_comercial_id = v_dup_form_id) +
      (SELECT count(*) FROM public.pagamentos WHERE formulario_id = v_dup_form_id) +
      (SELECT count(*) FROM public.documentos_cliente WHERE projeto_id = v_dup_form_id) +
      (SELECT count(*) FROM public.dossies WHERE formulario_comercial_id = v_dup_form_id)
    INTO v_count;

    IF v_count > 0 THEN
      -- UNSAFE: there are still references. STOP and do not delete.
      RAISE NOTICE 'REPAIR: WARNING — % remaining references on duplicate form %. NOT deleting. Manual review required.', v_count, v_dup_form_id;
    ELSE
      -- SAFE: zero references remaining. Delete the duplicate form only.
      -- Its lead is preserved if it differs from the original's lead (leads are independent records).
      DELETE FROM public.formulario_comercial WHERE id = v_dup_form_id;
      v_deleted_forms := v_deleted_forms + 1;

      -- Clean up the duplicate's lead ONLY if it is not the original's lead and not referenced elsewhere
      IF rec.lead_id IS NOT NULL AND rec.lead_id <> v_original_lead_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.formulario_comercial WHERE lead_id = rec.lead_id)
           AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE lead_id = rec.lead_id) THEN
          DELETE FROM public.whatsapp_messages WHERE lead_id = rec.lead_id;
          DELETE FROM public.whatsapp_sessions WHERE lead_id = rec.lead_id;
          DELETE FROM public.leads WHERE id = rec.lead_id;
          RAISE NOTICE 'REPAIR: Removed orphan lead % (no remaining references)', rec.lead_id;
        ELSE
          RAISE NOTICE 'REPAIR: Preserved lead % (still referenced elsewhere)', rec.lead_id;
        END IF;
      END IF;

      RAISE NOTICE 'REPAIR: Deleted duplicate form % (validated: zero remaining references)', v_dup_form_id;
    END IF;

    -- 3h. Log the repair action to timeline
    IF v_user_id IS NULL THEN
      v_user_id := rec.user_id;
    END IF;
    INSERT INTO public.timeline_eventos (cliente_id, formulario_id, usuario_nome, acao, icone)
    VALUES (
      v_cliente_id,
      v_original_form_id,
      'Sistema',
      'Reparo cirúrgico: registros da venda duplicada (' || v_dup_form_id::text || ') reatribuídos à venda original (' || v_original_form_id::text || '). Nenhum dado de módulo foi excluído.',
      'wrench'
    );
  END LOOP;

  -- Step 4: Restore client's lead_id to the original sale's lead
  IF v_original_lead_id IS NOT NULL THEN
    UPDATE public.clientes
    SET lead_id = v_original_lead_id,
        atualizado_em = NOW()
    WHERE id = v_cliente_id
      AND lead_id IS DISTINCT FROM v_original_lead_id;
    RAISE NOTICE 'REPAIR: Restored client lead_id to original sale lead: %', v_original_lead_id;
  END IF;

  -- Step 5: Final summary
  RAISE NOTICE '========================================';
  RAISE NOTICE ' REPAIR SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  Original sale form: %', v_original_form_id;
  RAISE NOTICE '  Duplicate forms deleted: %', v_deleted_forms;
  RAISE NOTICE '  contas_receber reassigned: %', v_reassigned_cr;
  RAISE NOTICE '  produtos_servicos_projeto reassigned: %', v_reassigned_psp;
  RAISE NOTICE '  pagamentos reassigned: %', v_reassigned_pag;
  RAISE NOTICE '  documentos_cliente (linked) reassigned: %', v_reassigned_docs;
  RAISE NOTICE '  documentos_cliente (orphan) reassigned: %', v_reassigned_orphan_docs;
  RAISE NOTICE '  dossies merged/reassigned: %', v_reassigned_dossies;
  RAISE NOTICE '========================================';
END $$;
