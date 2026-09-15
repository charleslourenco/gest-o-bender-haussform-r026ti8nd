-- Migração para ciclo de vida da triagem e faxina de dados dos leads estacionados em "Encaminhado Para"
-- Destinos mapeados:
-- 1. Fornecedor -> status 'Contactado', categoria 'Fornecedor', meta encaminhado_para_aba 'fornecedores'
-- 2. Parceiro -> status 'Contactado', categoria 'Parceiro', meta encaminhado_para_aba 'parceiros'
-- 3. Currículo -> status 'Candidato', categoria 'Currículo', meta encaminhado_para_aba 'curriculos'
-- 4. Follow up -> status 'Follow up', categoria 'Follow up', meta encaminhado_para_aba 'lead-followup'
-- 5. Orçamento -> status 'Novo Orçamento', categoria 'Orçamento', meta encaminhado_para_aba 'lead-orcamentos'
-- 6. Assistência -> status 'Novo', categoria 'Assistência', meta encaminhado_para_aba 'assistencia'
-- 7. Comercial (com encaminhado_para_aba = 'lead-consultoria') -> status 'Consultoria Inicial', categoria 'Comercial'

DO $$
BEGIN
  -- 1. Fornecedor (24 leads)
  UPDATE public.leads
  SET
    status = 'Contactado',
    atualizado_em = NOW(),
    notas_pessoais = CASE
      WHEN notas_pessoais LIKE '%___META_JSON___:%' THEN
        CASE 
          WHEN notas_pessoais NOT LIKE '%"encaminhado_para_aba"%' THEN
            REPLACE(notas_pessoais, '___META_JSON___:{', '___META_JSON___:{"encaminhado_para_aba":"fornecedores",')
          ELSE notas_pessoais
        END
      WHEN notas_pessoais IS NULL OR TRIM(notas_pessoais) = '' THEN
        '___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"fornecedores","encaminhado_em":"' || NOW()::text || '"}'
      ELSE
        notas_pessoais || E'\n\n___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"fornecedores","encaminhado_em":"' || NOW()::text || '"}'
    END
  WHERE status = 'Encaminhado Para' AND categoria = 'Fornecedor';

  -- 2. Parceiro (20 leads)
  UPDATE public.leads
  SET
    status = 'Contactado',
    atualizado_em = NOW(),
    notas_pessoais = CASE
      WHEN notas_pessoais LIKE '%___META_JSON___:%' THEN
        CASE 
          WHEN notas_pessoais NOT LIKE '%"encaminhado_para_aba"%' THEN
            REPLACE(notas_pessoais, '___META_JSON___:{', '___META_JSON___:{"encaminhado_para_aba":"parceiros",')
          ELSE notas_pessoais
        END
      WHEN notas_pessoais IS NULL OR TRIM(notas_pessoais) = '' THEN
        '___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"parceiros","encaminhado_em":"' || NOW()::text || '"}'
      ELSE
        notas_pessoais || E'\n\n___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"parceiros","encaminhado_em":"' || NOW()::text || '"}'
    END
  WHERE status = 'Encaminhado Para' AND categoria = 'Parceiro';

  -- 3. Currículo (14 leads)
  UPDATE public.leads
  SET
    status = 'Candidato',
    atualizado_em = NOW(),
    notas_pessoais = CASE
      WHEN notas_pessoais LIKE '%___META_JSON___:%' THEN
        CASE 
          WHEN notas_pessoais NOT LIKE '%"encaminhado_para_aba"%' THEN
            REPLACE(notas_pessoais, '___META_JSON___:{', '___META_JSON___:{"encaminhado_para_aba":"curriculos",')
          ELSE notas_pessoais
        END
      WHEN notas_pessoais IS NULL OR TRIM(notas_pessoais) = '' THEN
        '___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"curriculos","encaminhado_em":"' || NOW()::text || '"}'
      ELSE
        notas_pessoais || E'\n\n___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"curriculos","encaminhado_em":"' || NOW()::text || '"}'
    END
  WHERE status = 'Encaminhado Para' AND categoria = 'Currículo';

  -- 4. Follow up (5 leads)
  UPDATE public.leads
  SET
    status = 'Follow up',
    atualizado_em = NOW(),
    notas_pessoais = CASE
      WHEN notas_pessoais LIKE '%___META_JSON___:%' THEN
        CASE 
          WHEN notas_pessoais NOT LIKE '%"encaminhado_para_aba"%' THEN
            REPLACE(notas_pessoais, '___META_JSON___:{', '___META_JSON___:{"encaminhado_para_aba":"lead-followup",')
          ELSE notas_pessoais
        END
      WHEN notas_pessoais IS NULL OR TRIM(notas_pessoais) = '' THEN
        '___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"lead-followup","encaminhado_em":"' || NOW()::text || '"}'
      ELSE
        notas_pessoais || E'\n\n___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"lead-followup","encaminhado_em":"' || NOW()::text || '"}'
    END
  WHERE status = 'Encaminhado Para' AND categoria = 'Follow up';

  -- 5. Orçamento (6 leads)
  UPDATE public.leads
  SET
    status = 'Novo Orçamento',
    atualizado_em = NOW(),
    notas_pessoais = CASE
      WHEN notas_pessoais LIKE '%___META_JSON___:%' THEN
        CASE 
          WHEN notas_pessoais NOT LIKE '%"encaminhado_para_aba"%' THEN
            REPLACE(notas_pessoais, '___META_JSON___:{', '___META_JSON___:{"encaminhado_para_aba":"lead-orcamentos",')
          ELSE notas_pessoais
        END
      WHEN notas_pessoais IS NULL OR TRIM(notas_pessoais) = '' THEN
        '___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"lead-orcamentos","encaminhado_em":"' || NOW()::text || '"}'
      ELSE
        notas_pessoais || E'\n\n___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"lead-orcamentos","encaminhado_em":"' || NOW()::text || '"}'
    END
  WHERE status = 'Encaminhado Para' AND categoria = 'Orçamento';

  -- 6. Assistência (1 lead)
  UPDATE public.leads
  SET
    status = 'Novo',
    atualizado_em = NOW(),
    notas_pessoais = CASE
      WHEN notas_pessoais LIKE '%___META_JSON___:%' THEN
        CASE 
          WHEN notas_pessoais NOT LIKE '%"encaminhado_para_aba"%' THEN
            REPLACE(notas_pessoais, '___META_JSON___:{', '___META_JSON___:{"encaminhado_para_aba":"assistencia",')
          ELSE notas_pessoais
        END
      WHEN notas_pessoais IS NULL OR TRIM(notas_pessoais) = '' THEN
        '___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"assistencia","encaminhado_em":"' || NOW()::text || '"}'
      ELSE
        notas_pessoais || E'\n\n___META_JSON___:{"origem_aba":"novo-contato","encaminhado_para_aba":"assistencia","encaminhado_em":"' || NOW()::text || '"}'
    END
  WHERE status = 'Encaminhado Para' AND categoria = 'Assistência';

  -- 7. Comercial com destino lead-consultoria nos metadados (14 leads)
  UPDATE public.leads
  SET
    status = 'Consultoria Inicial',
    kanban_ativo = true,
    atualizado_em = NOW()
  WHERE status = 'Encaminhado Para' 
    AND categoria = 'Comercial' 
    AND notas_pessoais LIKE '%"encaminhado_para_aba":"lead-consultoria"%';

  -- 8. Quaisquer leads residuais ainda em 'Encaminhado Para': atualizar coluna para 'Despachados'
  UPDATE public.leads
  SET
    status = 'Despachados',
    atualizado_em = NOW()
  WHERE status = 'Encaminhado Para';
END $$;
