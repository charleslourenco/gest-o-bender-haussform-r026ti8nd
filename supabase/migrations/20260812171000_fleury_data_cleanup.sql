-- Fleury Data Cleanup
-- Removes ALL sale-related data for the Fleury client while PRESERVING the
-- clientes record itself, so the user can recreate the two sales manually.
--
-- Targeting: email = 'diegofleury@hotmail.com' OR nome ILIKE '%FLEURY%'
-- Idempotent: safe to run multiple times (DELETE on 0 rows is a no-op).
-- Only affects the Fleury client — no other client's data is touched.

DO $$
DECLARE
  v_cliente_id uuid;
  v_deleted int;
BEGIN
  -- Locate the Fleury client by email (primary) or name (fallback)
  SELECT id INTO v_cliente_id
  FROM public.clientes
  WHERE email = 'diegofleury@hotmail.com'
     OR nome ILIKE '%FLEURY%'
  ORDER BY
    (email = 'diegofleury@hotmail.com') DESC,
    criado_em ASC
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE NOTICE 'CLEANUP: No Fleury client found. No action taken.';
    RETURN;
  END IF;

  RAISE NOTICE 'CLEANUP: Found Fleury client %', v_cliente_id;

  -----------------------------------------------------------------
  -- 1. Child records of produtos_servicos_projeto (must go first)
  -----------------------------------------------------------------
  DELETE FROM public.historico_alocacao_montagem
  WHERE card_id IN (
    SELECT id FROM public.produtos_servicos_projeto WHERE cliente_id = v_cliente_id
  );

  DELETE FROM public.alocacao_montagem
  WHERE card_id IN (
    SELECT id FROM public.produtos_servicos_projeto WHERE cliente_id = v_cliente_id
  );

  DELETE FROM public.kanban_historico
  WHERE card_id IN (
    SELECT id FROM public.produtos_servicos_projeto WHERE cliente_id = v_cliente_id
  );

  -----------------------------------------------------------------
  -- 2. parcelas → pagamentos
  -----------------------------------------------------------------
  DELETE FROM public.parcelas
  WHERE pagamento_id IN (
    SELECT id FROM public.pagamentos WHERE cliente_id = v_cliente_id
  );

  DELETE FROM public.pagamentos WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 3. contas_receber
  -----------------------------------------------------------------
  DELETE FROM public.contas_receber WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 4. produtos_servicos_projeto
  -----------------------------------------------------------------
  DELETE FROM public.produtos_servicos_projeto WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 5. produtos_servicos (legacy)
  -----------------------------------------------------------------
  DELETE FROM public.produtos_servicos WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 6. solicitacoes_compra
  -----------------------------------------------------------------
  DELETE FROM public.solicitacoes_compra WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 7. assinantes → envelopes_assinatura
  -----------------------------------------------------------------
  DELETE FROM public.assinantes
  WHERE envelope_id IN (
    SELECT id FROM public.envelopes_assinatura WHERE cliente_id = v_cliente_id
  );

  -----------------------------------------------------------------
  -- 8. assinaturas
  -----------------------------------------------------------------
  DELETE FROM public.assinaturas WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 9. documentos_cliente
  -----------------------------------------------------------------
  DELETE FROM public.documentos_cliente WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 10. documentos_gerados
  -----------------------------------------------------------------
  DELETE FROM public.documentos_gerados WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 11. envelopes_assinatura
  -----------------------------------------------------------------
  DELETE FROM public.envelopes_assinatura WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 12. estoque_caixas_itens → estoque_caixas
  -----------------------------------------------------------------
  DELETE FROM public.estoque_caixas_itens
  WHERE caixa_id IN (
    SELECT id FROM public.estoque_caixas WHERE cliente_id = v_cliente_id
  );

  DELETE FROM public.estoque_caixas WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 13. ambientes
  -----------------------------------------------------------------
  DELETE FROM public.ambientes WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 14. timeline_eventos (FK to formulario_comercial via formulario_id)
  -----------------------------------------------------------------
  DELETE FROM public.timeline_eventos WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 15. dossies (FK to formulario_comercial via formulario_comercial_id)
  -----------------------------------------------------------------
  DELETE FROM public.dossies WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 16. formulario_comercial — MUST be last (referenced by many tables)
  -----------------------------------------------------------------
  DELETE FROM public.formulario_comercial WHERE cliente_id = v_cliente_id;

  -----------------------------------------------------------------
  -- 17. Storage objects cleanup is intentionally omitted here.
  --     Supabase enforces a protect_delete() trigger on storage.objects
  --     that blocks direct SQL deletes ("Direct deletion from storage
  --     tables is not allowed. Use the Storage API instead.").
  --     Any leftover files in the `dossiers` and `bender-clientes`
  --     buckets under {cliente_id}/ must be removed out-of-band via the
  --     Storage REST API (or SDK) from the application layer.
  -----------------------------------------------------------------

  -----------------------------------------------------------------
  -- 18. Reset lead status for any lead linked to this client
  --     so the user can re-sell from scratch
  -----------------------------------------------------------------
  UPDATE public.leads
  SET status = 'Novo Lead',
      data_venda = NULL,
      atualizado_em = NOW()
  WHERE id IN (
    SELECT lead_id FROM public.clientes WHERE id = v_cliente_id AND lead_id IS NOT NULL
  );

  -- Clear the client's lead_id so it's ready for fresh sales
  UPDATE public.clientes
  SET lead_id = NULL,
      atualizado_em = NOW()
  WHERE id = v_cliente_id;

  -----------------------------------------------------------------
  -- Summary
  -----------------------------------------------------------------
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'CLEANUP: All Fleury sale data removed. Client record % preserved.', v_cliente_id;
END $$;
