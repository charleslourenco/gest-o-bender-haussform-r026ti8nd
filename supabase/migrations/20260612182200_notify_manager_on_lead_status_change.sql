CREATE OR REPLACE FUNCTION public.notify_manager_on_lead_status_change()
RETURNS trigger AS $$
DECLARE
  v_interval INTERVAL;
  v_days INT;
  v_hours INT;
  v_minutes INT;
  v_time_str TEXT;
  v_consultor_nome TEXT := 'Não atribuído';
  v_manager_id UUID;
BEGIN
  -- Calculate time in previous status
  IF OLD.atualizado_em IS NULL THEN
    v_interval := '0 days'::interval;
  ELSE
    v_interval := GREATEST(now() - OLD.atualizado_em, '0 days'::interval);
  END IF;

  v_days := COALESCE(EXTRACT(DAY FROM v_interval)::INT, 0);
  v_hours := COALESCE(EXTRACT(HOUR FROM v_interval)::INT, 0);
  v_minutes := COALESCE(EXTRACT(MINUTE FROM v_interval)::INT, 0);
  v_time_str := v_days || ' dias, ' || v_hours || ' horas, ' || v_minutes || ' minutos';

  -- Get consultant name
  IF NEW.consultor_id IS NOT NULL THEN
    SELECT nome INTO v_consultor_nome FROM public.users WHERE id = NEW.consultor_id;
    IF v_consultor_nome IS NULL THEN
      v_consultor_nome := 'Não atribuído';
    END IF;
  END IF;

  -- Notify managers
  FOR v_manager_id IN
    SELECT u.id
    FROM public.users u
    LEFT JOIN public.matriz_permissoes mp ON mp.usuario_id = u.id AND mp.modulo = 'Comercial' AND mp.nivel_acesso = 'Admin'
    WHERE u.email = 'charleslourenco01@icloud.com' OR mp.id IS NOT NULL
    GROUP BY u.id
  LOOP
    INSERT INTO public.notificacoes (usuario_id, titulo, mensagem, lida, link)
    VALUES (
      v_manager_id,
      'Lead movido: ' || NEW.nome,
      OLD.status || ' → ' || NEW.status || ' | Consultor: ' || v_consultor_nome || ' | Tempo no estágio anterior: ' || v_time_str,
      false,
      '/comercial?lead_id=' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_manager_on_lead_status_change ON public.leads;

CREATE TRIGGER trg_notify_manager_on_lead_status_change
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_manager_on_lead_status_change();

-- Automação 'Notificar Gerente sobre Progresso' criada com sucesso.
