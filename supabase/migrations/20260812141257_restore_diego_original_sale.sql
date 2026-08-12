-- Restoration of corrupted data for client DIEGO DE ALBUQUERQUE FLEURY GUIMARAES.
--
-- This migration reverses the damage caused by the "orphan dossier adoption" and
-- "lead_id overwrite" bugs: the original R$ 150.926,90 sale (15/07/2026) had its
-- dossier hijacked and the client's lead_id re-pointed to a newer sale, and a
-- double-click created a duplicate R$ 2.768,25 sale.
--
-- Actions performed (only for this single client):
--   1. Re-attach the original dossier (with espelho documents) to the original
--      R$ 150.926,90 sale's formulario_comercial.
--   2. Restore the client's lead_id to the original sale's lead.
--   3. Remove the duplicate R$ 2.768,25 sale (form + lead + dossier), keeping
--      exactly one clean R$ 2.768,25 sale as an independent record.
--
-- Idempotent: safe to run multiple times. Affects no other client.
DO $$
DECLARE
  v_cliente_id uuid;
  v_original_form_id uuid;
  v_original_lead_id uuid;
  v_keep_form_id uuid;
  v_dossie_id uuid;
  v_count int;
  dup_rec RECORD;
BEGIN
  -- Locate the canonical Diego client record
  SELECT id INTO v_cliente_id
  FROM public.clientes
  WHERE nome = 'DIEGO DE ALBUQUERQUE FLEURY GUIMARAES'
    AND COALESCE(excluido, false) = false
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RETURN;
  END IF;

  -- Locate the original sale form (R$ 150.926,90) — the canonical first sale
  SELECT id, lead_id INTO v_original_form_id, v_original_lead_id
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id
    AND valor_total IS NOT NULL
    AND valor_total BETWEEN 150926.80 AND 150926.99
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_original_form_id IS NULL THEN
    RETURN;
  END IF;

  -- Step 1: Ensure the original form has its dossier attached.
  -- The bug could re-point the original dossier to a newer sale's form, or leave
  -- it orphaned. We only act if the original form currently has no dossier.
  SELECT id INTO v_dossie_id
  FROM public.dossies
  WHERE formulario_comercial_id = v_original_form_id
  LIMIT 1;

  IF v_dossie_id IS NULL THEN
    -- Try to recover a hijacked dossier: one currently pointing to a R$ 2.768,25 form
    SELECT d.id INTO v_dossie_id
    FROM public.dossies d
    WHERE d.cliente_id = v_cliente_id
      AND d.formulario_comercial_id IN (
        SELECT f.id FROM public.formulario_comercial f
        WHERE f.cliente_id = v_cliente_id
          AND f.valor_total IS NOT NULL
          AND f.valor_total BETWEEN 2768.15 AND 2768.35
      )
    ORDER BY d.criado_em ASC
    LIMIT 1;

    IF v_dossie_id IS NULL THEN
      -- Try an orphan dossier (no form link) for this client
      SELECT id INTO v_dossie_id
      FROM public.dossies
      WHERE cliente_id = v_cliente_id
        AND formulario_comercial_id IS NULL
      ORDER BY criado_em ASC
      LIMIT 1;
    END IF;

    IF v_dossie_id IS NOT NULL THEN
      -- Re-attach the recovered dossier to the original form (no other dossier is modified)
      UPDATE public.dossies
      SET formulario_comercial_id = v_original_form_id
      WHERE id = v_dossie_id;
    ELSE
      -- No recoverable dossier: create a fresh one for the original sale
      INSERT INTO public.dossies (cliente_id, formulario_comercial_id, user_id, status)
      SELECT v_cliente_id, v_original_form_id, f.user_id, 'em_documentacao'
      FROM public.formulario_comercial f
      WHERE f.id = v_original_form_id
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Step 2: Restore the client's lead_id to the original sale's lead
  IF v_original_lead_id IS NOT NULL THEN
    UPDATE public.clientes
    SET lead_id = v_original_lead_id
    WHERE id = v_cliente_id
      AND lead_id IS DISTINCT FROM v_original_lead_id;
  END IF;

  -- Step 3: Remove the duplicate R$ 2.768,25 sale (keep only one clean new sale)
  SELECT count(*) INTO v_count
  FROM public.formulario_comercial
  WHERE cliente_id = v_cliente_id
    AND valor_total IS NOT NULL
    AND valor_total BETWEEN 2768.15 AND 2768.35;

  IF v_count > 1 THEN
    -- Keep the oldest R$ 2.768,25 form as the single clean new sale
    SELECT id INTO v_keep_form_id
    FROM public.formulario_comercial
    WHERE cliente_id = v_cliente_id
      AND valor_total IS NOT NULL
      AND valor_total BETWEEN 2768.15 AND 2768.35
    ORDER BY criado_em ASC
    LIMIT 1;

    -- Ensure the kept form has a dossier (the hijacked dossier may have been
    -- re-attached to the original form in step 1, leaving this form without one)
    IF NOT EXISTS (
      SELECT 1 FROM public.dossies WHERE formulario_comercial_id = v_keep_form_id
    ) THEN
      INSERT INTO public.dossies (cliente_id, formulario_comercial_id, user_id, status)
      SELECT v_cliente_id, v_keep_form_id, f.user_id, 'em_documentacao'
      FROM public.formulario_comercial f
      WHERE f.id = v_keep_form_id
      ON CONFLICT DO NOTHING;
    END IF;

    -- Delete every other R$ 2.768,25 form (the duplicate(s)) and its dependencies
    FOR dup_rec IN
      SELECT id, lead_id
      FROM public.formulario_comercial
      WHERE cliente_id = v_cliente_id
        AND valor_total IS NOT NULL
        AND valor_total BETWEEN 2768.15 AND 2768.35
        AND id <> v_keep_form_id
    LOOP
      DELETE FROM public.dossies WHERE formulario_comercial_id = dup_rec.id;
      DELETE FROM public.produtos_servicos_projeto WHERE formulario_comercial_id = dup_rec.id;
      DELETE FROM public.contas_receber WHERE formulario_comercial_id = dup_rec.id;
      DELETE FROM public.pagamentos WHERE formulario_id = dup_rec.id;
      DELETE FROM public.formulario_comercial WHERE id = dup_rec.id;
      -- Remove the duplicate's lead only if it is not the original sale's lead
      IF dup_rec.lead_id IS NOT NULL AND dup_rec.lead_id <> v_original_lead_id THEN
        DELETE FROM public.whatsapp_messages WHERE lead_id = dup_rec.lead_id;
        DELETE FROM public.whatsapp_sessions WHERE lead_id = dup_rec.lead_id;
        DELETE FROM public.leads WHERE id = dup_rec.lead_id;
      END IF;
    END LOOP;
  END IF;
END $$;
