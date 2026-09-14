-- Migration: Faxina dos 17 leads fantasmas "Bender Haussform" criados com telefone-LID
-- 1) Preservar histórico de mensagens desvinculando os leads fantasmas (lead_id = NULL)
-- 2) Desvincular sessões de whatsapp
-- 3) Excluir os 17 leads fantasmas identificados

DO $$
DECLARE
  ghost_lead_ids UUID[];
BEGIN
  -- Selecionar IDs dos leads fantasmas com nome 'Bender Haussform' criados a partir de 03/09/2026 com telefone-LID
  SELECT ARRAY_AGG(id) INTO ghost_lead_ids
  FROM public.leads
  WHERE nome = 'Bender Haussform'
    AND criado_em >= '2026-09-03 00:00:00+00'
    AND (
      telefone ~ '^[0-9]{13,16}$' AND NOT telefone LIKE '55%'
      OR LENGTH(REGEXP_REPLACE(telefone, '\D', '', 'g')) > 13
      OR telefone IN (
        '51861914677352',
        '74260102033548',
        '14572975046794',
        '34226627952726',
        '192711005081602',
        '163737742913582',
        '4325636087935',
        '92384880771125',
        '190803922161732',
        '75432560976095',
        '127204063203342',
        '254902450270413',
        '260807795466262',
        '198655273357366',
        '21762616107192',
        '3440302391371',
        '166709323407361'
      )
    );

  IF ghost_lead_ids IS NOT NULL AND ARRAY_LENGTH(ghost_lead_ids, 1) > 0 THEN
    -- Desvincular mensagens para que fiquem salvas como órfãs (lead_id NULL) e não sejam deletadas pelo CASCADE
    UPDATE public.whatsapp_messages
    SET lead_id = NULL
    WHERE lead_id = ANY(ghost_lead_ids);

    -- Desvincular sessões
    UPDATE public.whatsapp_sessions
    SET lead_id = NULL
    WHERE lead_id = ANY(ghost_lead_ids);

    -- Excluir sessões associadas a esses telefones LID
    DELETE FROM public.whatsapp_sessions
    WHERE phone = ANY(
      ARRAY[
        '51861914677352',
        '74260102033548',
        '14572975046794',
        '34226627952726',
        '192711005081602',
        '163737742913582',
        '4325636087935',
        '92384880771125',
        '190803922161732',
        '75432560976095',
        '127204063203342',
        '254902450270413',
        '260807795466262',
        '198655273357366',
        '21762616107192',
        '3440302391371',
        '166709323407361'
      ]
    );

    -- Excluir definitivamente os 17 leads fantasmas
    DELETE FROM public.leads
    WHERE id = ANY(ghost_lead_ids);

    RAISE NOTICE 'Limpeza concluída com sucesso para os leads fantasmas.';
  END IF;
END $$;
