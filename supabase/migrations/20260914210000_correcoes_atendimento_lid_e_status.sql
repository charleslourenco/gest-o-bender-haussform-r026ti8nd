-- Migration: correções no módulo de atendimentos
-- 1) Remover DEFAULT 'aguardando_resposta' de leads.status_atendimento
-- 2) Backfillar leads SEM mensagem de cliente para NULL
-- 3) Limpar status_atendimento dos leads excluídos (excluido = true)
-- 4) Backfillar mensagens vazias inbound com '[mídia]'
-- 5) Backfillar/associar mensagens outbound órfãs via LID/horário/contexto

DO $$
BEGIN
  -- 1. Remover DEFAULT 'aguardando_resposta' da coluna status_atendimento na tabela leads
  ALTER TABLE public.leads ALTER COLUMN status_atendimento DROP DEFAULT;

  -- 2. Limpar status_atendimento dos leads excluídos (excluido = true)
  UPDATE public.leads
  SET status_atendimento = NULL,
      atualizado_em = NOW()
  WHERE excluido = true
    AND status_atendimento = 'aguardando_resposta';

  -- 3. Backfillar leads NÃO excluídos que têm status_atendimento = 'aguardando_resposta',
  -- mas que NUNCA tiveram nenhuma mensagem de cliente (falsos positivos do DEFAULT)
  UPDATE public.leads l
  SET status_atendimento = NULL,
      atualizado_em = NOW()
  WHERE l.status_atendimento = 'aguardando_resposta'
    AND (l.excluido IS NOT TRUE)
    AND NOT EXISTS (
      SELECT 1
      FROM public.whatsapp_messages wm
      WHERE wm.lead_id = l.id
        AND wm.sender_type = 'cliente'
    );

  -- 4. Faxina: Backfillar mensagens vazias de clientes com marcador '[mídia]'
  UPDATE public.whatsapp_messages
  SET content = '[mídia]'
  WHERE sender_type = 'cliente'
    AND (content IS NULL OR TRIM(content) = '');

  -- 5. Casamento e resolução das mensagens outbound órfãs gravadas hoje com LIDs
  -- Caso 1: Daine Hess (LID 198655273357366 -> telefone 5547992105390)
  UPDATE public.whatsapp_messages
  SET lead_id = (SELECT id FROM public.leads WHERE telefone = '5547992105390' LIMIT 1),
      phone = '5547992105390',
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{matched_by}', '"lid_manual_daine"'::jsonb)
  WHERE phone = '198655273357366'
    AND lead_id IS NULL;

  -- Caso 2: Bruno Ribas (LID 3440302391371 -> telefone 5555981457713)
  UPDATE public.whatsapp_messages
  SET lead_id = (SELECT id FROM public.leads WHERE telefone = '5555981457713' LIMIT 1),
      phone = '5555981457713',
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{matched_by}', '"lid_manual_bruno"'::jsonb)
  WHERE phone = '3440302391371'
    AND lead_id IS NULL;

  -- Caso 3: Pablo J. Vailatti (LID 75432560976095 -> telefone 5547999670516)
  UPDATE public.whatsapp_messages
  SET lead_id = (SELECT id FROM public.leads WHERE telefone = '5547999670516' LIMIT 1),
      phone = '5547999670516',
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{matched_by}', '"lid_manual_pablo"'::jsonb)
  WHERE phone = '75432560976095'
    AND lead_id IS NULL;

  -- Caso 4: Charles (LID 260807795466262 -> telefone 5547992763627)
  UPDATE public.whatsapp_messages
  SET lead_id = (SELECT id FROM public.leads WHERE telefone = '5547992763627' LIMIT 1),
      phone = '5547992763627',
      metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{matched_by}', '"lid_manual_charles"'::jsonb)
  WHERE phone = '260807795466262'
    AND lead_id IS NULL;

  -- Caso 5: Resolução genérica inteligente para as demais mensagens outbound órfãs
  -- Casando pelo lead que teve mensagem inbound de cliente mais próxima no tempo (janela de até 30 minutos antes)
  UPDATE public.whatsapp_messages wm
  SET lead_id = matched.lead_id,
      phone = matched.telefone,
      metadata = jsonb_set(COALESCE(wm.metadata, '{}'::jsonb), '{matched_by}', '"lid_temporal_match"'::jsonb)
  FROM (
    SELECT DISTINCT ON (orphan.id)
      orphan.id as msg_id,
      inbound.lead_id,
      l.telefone
    FROM public.whatsapp_messages orphan
    JOIN LATERAL (
      SELECT im.lead_id, im.created_at
      FROM public.whatsapp_messages im
      WHERE im.direction = 'inbound'
        AND im.sender_type = 'cliente'
        AND im.lead_id IS NOT NULL
        AND im.created_at <= orphan.created_at
        AND im.created_at >= orphan.created_at - interval '30 minutes'
      ORDER BY im.created_at DESC
      LIMIT 1
    ) inbound ON true
    JOIN public.leads l ON l.id = inbound.lead_id
    WHERE orphan.direction = 'outbound'
      AND orphan.lead_id IS NULL
  ) matched
  WHERE wm.id = matched.msg_id;

END $$;
