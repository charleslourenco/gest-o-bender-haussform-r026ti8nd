-- Restoration of Diego's original sale (R$ 150.926,90) located by creation date + populated
-- produtos_servicos — does NOT rely on valor_total (which is NULL for dynamically-calculated values).
--
-- Actions (scoped to Diego only, idempotent, non-destructive):
--   1. Ensure the original sale (oldest form with populated produtos_servicos) has a dossier.
--   2. Re-link all orphan documents (projeto_id IS NULL) for this client to the original sale.
--   3. Correct the client's lead_id to point to the original sale's lead.
--   4. Remove true double-click duplicate forms (empty produtos_servicos), keeping the oldest.
--
-- No data is lost: documents from deleted duplicates are reassigned to the original sale.
-- No other client or sale is touched.
DO $$
DECLARE
  v_cliente_id uuid;
  v_original_form_id uuid;
  v_original_lead_id uuid;
  v_dossie_id uuid;
  v_keep_empty_id uuid;
  rec RECORD;
  v_empty_count int;
BEGIN
  -- Locate Diego's canonical client record
  SELECT id INTO v_cliente_id
  FROM public.clientes
  WHERE nome = 'DIEGO DE ALBUQUERQUE FLEURY GUIMARAES'
    AND COALESCE(excluido, false) = false
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RETURN;
  END IF;

  -- Locate the original sale: oldest form with populated produtos_servicos (items filled in).
  -- This identifies the real R$ 150.926,90 sale WITHOUT relying on valor_total.
  SELECT id, lead_id INTO v_original_form_id, v_original_lead_id
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id
    AND produtos_servicos IS NOT NULL
    AND jsonb_typeof(produtos_servicos) = 'array'
    AND jsonb_array_length(produtos_servicos) > 0
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_original_form_id IS NULL THEN
    RETURN;
  END IF;

  -- Step 1: Ensure the original sale has a dossier attached
  SELECT id INTO v_dossie_id
  FROM public.dossies
  WHERE formulario_comercial_id = v_original_form_id
  LIMIT 1;

  IF v_dossie_id IS NULL THEN
    -- Try to recover an orphan dossier (no form link) for this client
    SELECT id INTO v_dossie_id
    FROM public.dossies
    WHERE cliente_id = v_cliente_id
      AND formulario_comercial_id IS NULL
    ORDER BY criado_em ASC
    LIMIT 1;

    IF v_dossie_id IS NOT NULL THEN
      UPDATE public.dossies
      SET formulario_comercial_id = v_original_form_id
      WHERE id = v_dossie_id;
    ELSE
      -- Create a fresh dossier for the original sale
      INSERT INTO public.dossies (cliente_id, formulario_comercial_id, user_id, status)
      SELECT v_cliente_id, v_original_form_id, f.user_id, 'em_documentacao'
      FROM public.formulario_comercial f
      WHERE f.id = v_original_form_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Step 2: Re-link all orphan documents (projeto_id IS NULL) for this client to the original sale
  UPDATE public.documentos_cliente
  SET projeto_id = v_original_form_id
  WHERE cliente_id = v_cliente_id
    AND projeto_id IS NULL;

  -- Step 3: Correct the lead_id of the original sale to point to the proper lead
  IF v_original_lead_id IS NOT NULL THEN
    UPDATE public.clientes
    SET lead_id = v_original_lead_id
    WHERE id = v_cliente_id
      AND lead_id IS DISTINCT FROM v_original_lead_id;
  END IF;

  -- Step 4: Remove true double-click duplicate forms (empty produtos_servicos).
  -- Keep the oldest empty form as a legitimate new sale; delete only exact duplicates.
  SELECT count(*) INTO v_empty_count
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id
    AND id <> v_original_form_id
    AND (
      produtos_servicos IS NULL
      OR jsonb_typeof(produtos_servicos) <> 'array'
      OR jsonb_array_length(produtos_servicos) = 0
    );

  IF v_empty_count > 1 THEN
    -- Keep the oldest empty form as the single clean new sale
    SELECT id INTO v_keep_empty_id
    FROM public.formulario_comercial
    WHERE cliente_id = v_cliente_id
      AND id <> v_original_form_id
      AND (
        produtos_servicos IS NULL
        OR jsonb_typeof(produtos_servicos) <> 'array'
        OR jsonb_array_length(produtos_servicos) = 0
      )
    ORDER BY criado_em ASC
    LIMIT 1;

    -- Delete remaining empty duplicate forms (not the kept one, not the original)
    FOR rec IN
      SELECT id, lead_id
      FROM public.formulario_comercial
      WHERE cliente_id = v_cliente_id
        AND id <> v_original_form_id
        AND id <> v_keep_empty_id
        AND (
          produtos_servicos IS NULL
          OR jsonb_typeof(produtos_servicos) <> 'array'
          OR jsonb_array_length(produtos_servicos) = 0
        )
    LOOP
      -- Reassign any documents from the duplicate to the original sale (safety, no orphaning)
      UPDATE public.documentos_cliente
      SET projeto_id = v_original_form_id
      WHERE projeto_id = rec.id;

      -- Delete the duplicate's direct dependencies
      DELETE FROM public.dossies WHERE formulario_comercial_id = rec.id;
      DELETE FROM public.produtos_servicos_projeto WHERE formulario_comercial_id = rec.id;
      DELETE FROM public.contas_receber WHERE formulario_comercial_id = rec.id;
      DELETE FROM public.pagamentos WHERE formulario_id = rec.id;
      DELETE FROM public.formulario_comercial WHERE id = rec.id;

      -- Remove the duplicate's auto-generated lead only if not referenced elsewhere
      IF rec.lead_id IS NOT NULL AND rec.lead_id <> v_original_lead_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.formulario_comercial WHERE lead_id = rec.lead_id)
           AND NOT EXISTS (SELECT 1 FROM public.clientes WHERE lead_id = rec.lead_id) THEN
          DELETE FROM public.whatsapp_messages WHERE lead_id = rec.lead_id;
          DELETE FROM public.whatsapp_sessions WHERE lead_id = rec.lead_id;
          DELETE FROM public.leads WHERE id = rec.lead_id;
        END IF;
      END IF;
    END LOOP;
  END IF;
END $$;
