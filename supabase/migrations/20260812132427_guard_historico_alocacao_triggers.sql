-- Guard historico_alocacao_montagem triggers so history is only logged when the
-- card_id still exists in produtos_servicos_projeto (and montador_id in montadores).
--
-- Root cause of the FK violation:
-- When a produtos_servicos_projeto card is deleted (e.g. by sync_formulario_items
-- during a "Nova Venda" form save) while alocacao_montagem rows still reference it,
-- the ON DELETE CASCADE removes those alocacao_montagem rows. The BEFORE DELETE
-- trigger on alocacao_montagem then attempts to insert a historico record using
-- OLD.card_id — but by that point the parent card has already been removed by the
-- cascade, so the historico_alocacao_montagem_card_id_fkey constraint is violated.
--
-- Fix: skip the historico insert when the card (or montador) no longer exists.
-- This is additive and idempotent (CREATE OR REPLACE FUNCTION) — no schema
-- structure changes, no new tables/columns, no destructive operations.

CREATE OR REPLACE FUNCTION public.log_alocacao_montagem_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.produtos_servicos_projeto WHERE id = NEW.card_id)
     AND EXISTS (SELECT 1 FROM public.montadores WHERE id = NEW.montador_id) THEN
    INSERT INTO public.historico_alocacao_montagem (card_id, montador_id, acao)
    VALUES (NEW.card_id, NEW.montador_id, 'alocado');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_alocacao_montagem_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.produtos_servicos_projeto WHERE id = OLD.card_id)
     AND EXISTS (SELECT 1 FROM public.montadores WHERE id = OLD.montador_id) THEN
    INSERT INTO public.historico_alocacao_montagem (card_id, montador_id, acao)
    VALUES (OLD.card_id, OLD.montador_id, 'desalocado');
  END IF;
  RETURN OLD;
END;
$function$;

-- Triggers reference functions by name, so they automatically pick up the new
-- function bodies. No need to drop/recreate the triggers themselves.
