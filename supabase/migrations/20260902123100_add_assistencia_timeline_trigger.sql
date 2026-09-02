-- Migration: trigger on leads for 'Assistência' category status changes
-- Adjustment 4:
-- When a lead with categoria = 'Assistência' (or 'Assistencia') changes status,
-- log a timeline event for the client linked via clientes.lead_id = NEW.id.
-- Uses real logged-in user name (fallback: 'Sistema'), contextual stage icon,
-- and descriptive action.

CREATE OR REPLACE FUNCTION public.log_assistencia_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_nome text;
  v_cliente_id uuid;
  v_stage_icon text;
  v_status_norm text;
  v_cat_norm text;
  v_form_id uuid;
BEGIN
  v_cat_norm := lower(trim(COALESCE(NEW.categoria, '')));
  
  -- Check if this lead belongs to Assistência category and status changed
  IF (v_cat_norm = 'assistência' OR v_cat_norm = 'assistencia') AND (NEW.status IS DISTINCT FROM OLD.status) THEN
    -- Find linked client via clientes.lead_id
    SELECT id INTO v_cliente_id
    FROM public.clientes
    WHERE lead_id = NEW.id
      AND excluido IS NOT TRUE
    LIMIT 1;

    -- If client found, insert timeline event
    IF v_cliente_id IS NOT NULL THEN
      -- Get real user name
      IF auth.uid() IS NOT NULL THEN
        SELECT nome INTO v_user_nome FROM public.users WHERE id = auth.uid();
      END IF;

      IF v_user_nome IS NULL OR trim(v_user_nome) = '' THEN
        v_user_nome := 'Sistema';
      END IF;

      -- Map icon according to assistance status
      v_status_norm := lower(trim(COALESCE(NEW.status, '')));
      IF v_status_norm IN ('nova assistência', 'nova assistencia', 'novo', 'nova_assistencia', 'aguardando consultor') THEN
        v_stage_icon := '🛠️';
      ELSIF v_status_norm IN ('em andamento', 'em atendimento', 'em_andamento', 'encaminhado para') THEN
        v_stage_icon := '🔧';
      ELSIF v_status_norm IN ('concluída', 'concluida', 'concluido', 'resolvido') THEN
        v_stage_icon := '✅';
      ELSIF v_status_norm IN ('perdido', 'cancelado') THEN
        v_stage_icon := '⚠️';
      ELSE
        v_stage_icon := '🛠️';
      END IF;

      -- Optional: check if there is an active/linked commercial form for this client/lead
      SELECT id INTO v_form_id
      FROM public.formulario_comercial
      WHERE lead_id = NEW.id OR cliente_id = v_cliente_id
      ORDER BY criado_em DESC
      LIMIT 1;

      INSERT INTO public.timeline_eventos (
        cliente_id,
        formulario_id,
        usuario_nome,
        acao,
        icone
      )
      VALUES (
        v_cliente_id,
        v_form_id,
        v_user_nome,
        'Moveu a assistência para a etapa: ' || NEW.status,
        v_stage_icon
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on leads
DROP TRIGGER IF EXISTS trg_log_assistencia_history ON public.leads;

CREATE TRIGGER trg_log_assistencia_history
  AFTER UPDATE OF status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_assistencia_history();
