-- Final comprehensive consolidation of ALL duplicate client records for diegofleury@hotmail.com
-- into the canonical record DIEGO DE ALBUQUERQUE FLEURY GUIMARAES.
-- Handles the three known duplicates: DIEGO DE ALBUQUERQUE FLEURY GUIMARAES (survivor),
-- Diego Fleury, and Diego Flury.
-- Idempotent: safe to run multiple times — if all duplicates are already excluded, this is a no-op.
DO $$
DECLARE
  v_survivor_id uuid;
  v_survivor_nome text;
  v_email text := 'diegofleury@hotmail.com';
  v_survivor_name text := 'DIEGO DE ALBUQUERQUE FLEURY GUIMARAES';
  dup_rec RECORD;
  v_dup_prefix text;
  v_surv_prefix text;
BEGIN
  -- Step 0: If ALL records for this email are excluded, un-exclude the canonical one
  IF NOT EXISTS (
    SELECT 1 FROM public.clientes
    WHERE email = v_email AND COALESCE(excluido, false) = false
  ) THEN
    UPDATE public.clientes
    SET excluido = false, atualizado_em = NOW()
    WHERE email = v_email
      AND nome = v_survivor_name
      AND COALESCE(excluido, true) = true;

    IF NOT EXISTS (
      SELECT 1 FROM public.clientes
      WHERE email = v_email AND COALESCE(excluido, false) = false
    ) THEN
      UPDATE public.clientes
      SET excluido = false, atualizado_em = NOW()
      WHERE id IN (
        SELECT id FROM public.clientes
        WHERE email = v_email
        ORDER BY
          (nome = v_survivor_name)::int DESC,
          (cpf IS NOT NULL)::int +
          (telefone IS NOT NULL AND telefone <> '')::int DESC,
          criado_em ASC
        LIMIT 1
      );
    END IF;
  END IF;

  -- Find the survivor: prefer DIEGO DE ALBUQUERQUE FLEURY GUIMARAES with a dossier
  SELECT c.id, c.nome INTO v_survivor_id, v_survivor_nome
  FROM public.clientes c
  WHERE c.email = v_email
    AND COALESCE(c.excluido, false) = false
  ORDER BY
    (c.nome = v_survivor_name)::int DESC,
    (EXISTS (SELECT 1 FROM public.dossies d WHERE d.cliente_id = c.id))::int DESC,
    (c.cpf IS NOT NULL)::int +
    (c.telefone IS NOT NULL AND c.telefone <> '')::int +
    (c.endereco_obra IS NOT NULL)::int +
    (c.cep IS NOT NULL)::int +
    (c.cidade IS NOT NULL)::int +
    (c.estado IS NOT NULL)::int +
    (c.data_nascimento IS NOT NULL)::int +
    (c.profissao IS NOT NULL)::int +
    (c.lead_id IS NOT NULL)::int +
    (c.usuario_id IS NOT NULL)::int DESC,
    c.criado_em ASC
  LIMIT 1;

  IF v_survivor_id IS NULL THEN
    RETURN;
  END IF;

  v_surv_prefix := v_survivor_id::text || '/';

  -- Loop through ALL remaining duplicates (non-excluded, same email, not the survivor)
  FOR dup_rec IN
    SELECT id, nome FROM public.clientes
    WHERE email = v_email
      AND COALESCE(excluido, false) = false
      AND id <> v_survivor_id
    ORDER BY criado_em ASC
  LOOP
    v_dup_prefix := dup_rec.id::text || '/';

    -- 1. Merge missing fields from duplicate into survivor
    UPDATE public.clientes
    SET
      cpf = COALESCE(cpf, (SELECT cpf FROM public.clientes WHERE id = dup_rec.id)),
      telefone = COALESCE(NULLIF(telefone, ''), (SELECT telefone FROM public.clientes WHERE id = dup_rec.id)),
      endereco_obra = COALESCE(endereco_obra, (SELECT endereco_obra FROM public.clientes WHERE id = dup_rec.id)),
      numero = COALESCE(numero, (SELECT numero FROM public.clientes WHERE id = dup_rec.id)),
      complemento = COALESCE(complemento, (SELECT complemento FROM public.clientes WHERE id = dup_rec.id)),
      bairro = COALESCE(bairro, (SELECT bairro FROM public.clientes WHERE id = dup_rec.id)),
      cidade = COALESCE(cidade, (SELECT cidade FROM public.clientes WHERE id = dup_rec.id)),
      estado = COALESCE(estado, (SELECT estado FROM public.clientes WHERE id = dup_rec.id)),
      cep = COALESCE(cep, (SELECT cep FROM public.clientes WHERE id = dup_rec.id)),
      tipo_imovel = COALESCE(tipo_imovel, (SELECT tipo_imovel FROM public.clientes WHERE id = dup_rec.id)),
      metragem_total = COALESCE(metragem_total, (SELECT metragem_total FROM public.clientes WHERE id = dup_rec.id)),
      data_nascimento = COALESCE(data_nascimento, (SELECT data_nascimento FROM public.clientes WHERE id = dup_rec.id)),
      profissao = COALESCE(profissao, (SELECT profissao FROM public.clientes WHERE id = dup_rec.id)),
      renda = COALESCE(renda, (SELECT renda FROM public.clientes WHERE id = dup_rec.id)),
      referencia_bancaria = COALESCE(referencia_bancaria, (SELECT referencia_bancaria FROM public.clientes WHERE id = dup_rec.id)),
      tipo_pessoa = COALESCE(tipo_pessoa, (SELECT tipo_pessoa FROM public.clientes WHERE id = dup_rec.id)),
      nome_fantasia = COALESCE(nome_fantasia, (SELECT nome_fantasia FROM public.clientes WHERE id = dup_rec.id)),
      inscricao_estadual = COALESCE(inscricao_estadual, (SELECT inscricao_estadual FROM public.clientes WHERE id = dup_rec.id)),
      data_abertura = COALESCE(data_abertura, (SELECT data_abertura FROM public.clientes WHERE id = dup_rec.id)),
      lead_id = COALESCE(lead_id, (SELECT lead_id FROM public.clientes WHERE id = dup_rec.id)),
      usuario_id = COALESCE(usuario_id, (SELECT usuario_id FROM public.clientes WHERE id = dup_rec.id)),
      atualizado_em = NOW()
    WHERE id = v_survivor_id;

    -- 2. Move storage files from duplicate's folder to survivor's folder (no overwrites)
    UPDATE storage.objects
    SET name = v_surv_prefix || substring(name from length(v_dup_prefix) + 1),
        updated_at = NOW()
    WHERE bucket_id IN ('bender_clientes', 'dossiers')
      AND name LIKE v_dup_prefix || '%'
      AND NOT EXISTS (
        SELECT 1 FROM storage.objects s2
        WHERE s2.bucket_id = storage.objects.bucket_id
          AND s2.name = v_surv_prefix || substring(storage.objects.name from length(v_dup_prefix) + 1)
      );

    -- 3. Update arquivo_url / arquivo_assinado_url in documentos_cliente
    UPDATE public.documentos_cliente
    SET arquivo_url = v_surv_prefix || substring(arquivo_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND arquivo_url IS NOT NULL AND arquivo_url LIKE v_dup_prefix || '%';
    UPDATE public.documentos_cliente
    SET arquivo_assinado_url = v_surv_prefix || substring(arquivo_assinado_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND arquivo_assinado_url IS NOT NULL AND arquivo_assinado_url LIKE v_dup_prefix || '%';

    -- 4. Update path in documentos_gerados
    UPDATE public.documentos_gerados
    SET path = v_surv_prefix || substring(path from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND path IS NOT NULL AND path LIKE v_dup_prefix || '%';

    -- 5. Update URL fields in dossies
    UPDATE public.dossies SET contrato_url = v_surv_prefix || substring(contrato_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND contrato_url IS NOT NULL AND contrato_url LIKE v_dup_prefix || '%';
    UPDATE public.dossies SET termo_conclusao_url = v_surv_prefix || substring(termo_conclusao_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND termo_conclusao_url IS NOT NULL AND termo_conclusao_url LIKE v_dup_prefix || '%';
    UPDATE public.dossies SET termo_garantia_url = v_surv_prefix || substring(termo_garantia_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND termo_garantia_url IS NOT NULL AND termo_garantia_url LIKE v_dup_prefix || '%';
    UPDATE public.dossies SET ata_reuniao_url = v_surv_prefix || substring(ata_reuniao_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND ata_reuniao_url IS NOT NULL AND ata_reuniao_url LIKE v_dup_prefix || '%';
    UPDATE public.dossies SET caderno_tecnico_url = v_surv_prefix || substring(caderno_tecnico_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND caderno_tecnico_url IS NOT NULL AND caderno_tecnico_url LIKE v_dup_prefix || '%';
    UPDATE public.dossies SET renders_url = v_surv_prefix || substring(renders_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND renders_url IS NOT NULL AND renders_url LIKE v_dup_prefix || '%';
    UPDATE public.dossies SET arquivo_projeto_url = v_surv_prefix || substring(arquivo_projeto_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND arquivo_projeto_url IS NOT NULL AND arquivo_projeto_url LIKE v_dup_prefix || '%';
    UPDATE public.dossies SET drafts_medida_url = v_surv_prefix || substring(drafts_medida_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND drafts_medida_url IS NOT NULL AND drafts_medida_url LIKE v_dup_prefix || '%';

    -- 6. Update comprovante_url in estoque_caixas and contas_receber
    UPDATE public.estoque_caixas
    SET comprovante_url = v_surv_prefix || substring(comprovante_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND comprovante_url IS NOT NULL AND comprovante_url LIKE v_dup_prefix || '%';
    UPDATE public.contas_receber
    SET comprovante_url = v_surv_prefix || substring(comprovante_url from length(v_dup_prefix) + 1)
    WHERE cliente_id = dup_rec.id AND comprovante_url IS NOT NULL AND comprovante_url LIKE v_dup_prefix || '%';

    -- 7. Handle formulario_comercial (UNIQUE constraint on lead_id)
    -- Reassign dossies that reference duplicate's conflicting forms to survivor's forms
    UPDATE public.dossies d
    SET formulario_comercial_id = sf.id
    FROM public.formulario_comercial df, public.formulario_comercial sf
    WHERE df.cliente_id = dup_rec.id
      AND sf.cliente_id = v_survivor_id
      AND df.lead_id = sf.lead_id
      AND d.formulario_comercial_id = df.id;

    -- Delete duplicate's forms that conflict (same lead_id as survivor's forms)
    DELETE FROM public.formulario_comercial
    WHERE cliente_id = dup_rec.id
      AND lead_id IN (SELECT lead_id FROM public.formulario_comercial WHERE cliente_id = v_survivor_id);

    -- Update remaining (non-conflicting) forms to point to survivor
    UPDATE public.formulario_comercial SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;

    -- 8. Migrate all remaining related data from duplicate to survivor
    UPDATE public.dossies SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.documentos_cliente SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.documentos_gerados SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.envelopes_assinatura SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.assinaturas SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.contas_receber SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.pagamentos SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.produtos_servicos SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.produtos_servicos_projeto SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.ambientes SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.estoque_caixas SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.timeline_eventos SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;
    UPDATE public.solicitacoes_compra SET cliente_id = v_survivor_id WHERE cliente_id = dup_rec.id;

    -- 9. Update cliente_nome text fields in tables that use name instead of FK
    UPDATE public.estoque_itens_cliente
    SET cliente_nome = v_survivor_nome
    WHERE cliente_nome = dup_rec.nome;
    UPDATE public.estoque_sobras
    SET cliente_nome = v_survivor_nome
    WHERE cliente_nome = dup_rec.nome;
    UPDATE public.estoque_alocacoes
    SET cliente_nome = v_survivor_nome
    WHERE cliente_nome = dup_rec.nome;

    -- 10. Log consolidation in timeline
    INSERT INTO public.timeline_eventos (cliente_id, usuario_nome, acao, icone)
    VALUES (v_survivor_id, 'Sistema', 'Consolidação final de registro duplicado (' || dup_rec.nome || ') executada. Dados migrados e duplicata excluída logicamente.', 'merge');

    -- 11. Soft delete duplicate (logical deletion only — never physical delete)
    UPDATE public.clientes SET excluido = true, atualizado_em = NOW() WHERE id = dup_rec.id;
  END LOOP;
END $$;
