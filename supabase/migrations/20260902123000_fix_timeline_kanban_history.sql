-- Migration: update log_kanban_history to record real user name, form id, and contextual stage icons
-- Adjustments 1, 2, 3:
-- 1. Real user name: query public.users using auth.uid(), fallback to 'Sistema'
-- 2. Link to sale: formulario_id = NEW.formulario_comercial_id
-- 3. Stage icons: emoji mapping per stage (iniciar 🚀, router 🔀, etc.), fallback 🗂️

CREATE OR REPLACE FUNCTION public.log_kanban_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_status_map jsonb := '{
    "iniciar": "Iniciar",
    "aguardando_liberacao": "Aguardando liberação",
    "medida_fina": "Medida Fina",
    "reuniao_analise": "Reunião de Análise",
    "caderno_tecnico": "Caderno Técnico",
    "alteracao_projeto": "Alteração de projeto",
    "lista_materiais": "Lista de Materiais",
    "aguardando_plano_corte": "Aguardando Plano de Corte",
    "router": "Router",
    "coladeira": "Coladeira",
    "bancada": "Bancada",
    "embalagem": "Embalagem",
    "expedicao": "Expedição",
    "aguardando_agenda": "Aguardando Agenda",
    "transporte": "Transporte",
    "montagem": "Montagem",
    "item_terceirizado": "Item Terceirizado",
    "pendencia": "Pendência",
    "assistencia": "Assistência",
    "concluido": "Concluído"
  }'::jsonb;
  
  v_icon_map jsonb := '{
    "iniciar": "🚀",
    "aguardando_liberacao": "⏳",
    "medida_fina": "📏",
    "reuniao_analise": "📋",
    "caderno_tecnico": "📘",
    "alteracao_projeto": "✏️",
    "lista_materiais": "📦",
    "aguardando_plano_corte": "📐",
    "router": "🔀",
    "coladeira": "🧴",
    "bancada": "🏭",
    "embalagem": "📦",
    "expedicao": "🚚",
    "aguardando_agenda": "🗓️",
    "transporte": "🚛",
    "montagem": "🔧",
    "item_terceirizado": "🤝",
    "pendencia": "⚠️",
    "assistencia": "🛠️",
    "concluido": "✅"
  }'::jsonb;

  human_status text;
  stage_icon text;
  v_user_nome text;
BEGIN
  IF NEW.status_analise IS DISTINCT FROM OLD.status_analise THEN
    INSERT INTO public.kanban_historico (card_id, status_anterior, status_novo, usuario_id)
    VALUES (NEW.id, OLD.status_analise, NEW.status_analise, auth.uid());
    
    IF NEW.cliente_id IS NOT NULL THEN
      -- 1. Obter nome real do usuário logado
      IF auth.uid() IS NOT NULL THEN
        SELECT nome INTO v_user_nome FROM public.users WHERE id = auth.uid();
      END IF;
      
      IF v_user_nome IS NULL OR trim(v_user_nome) = '' THEN
        v_user_nome := 'Sistema';
      END IF;

      -- 2. Human status e ícone por etapa
      human_status := COALESCE(v_status_map->>NEW.status_analise, NEW.status_analise);
      stage_icon := COALESCE(v_icon_map->>NEW.status_analise, '🗂️');

      -- 3. Inserir timeline_eventos com formulario_id vinculado
      INSERT INTO public.timeline_eventos (
        cliente_id,
        formulario_id,
        usuario_nome,
        acao,
        icone
      )
      VALUES (
        NEW.cliente_id,
        NEW.formulario_comercial_id,
        v_user_nome,
        'Moveu o ambiente [' || NEW.nome_produto || '] para a etapa: ' || human_status,
        stage_icon
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on produtos_servicos_projeto
DROP TRIGGER IF EXISTS on_kanban_status_change ON public.produtos_servicos_projeto;

CREATE TRIGGER on_kanban_status_change
  AFTER UPDATE ON public.produtos_servicos_projeto
  FOR EACH ROW
  EXECUTE FUNCTION public.log_kanban_history();
