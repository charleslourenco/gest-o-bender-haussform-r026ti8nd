-- Ensure the 'desalocado' history record is created BEFORE the allocation row is deleted,
-- within the same transaction (atomic). This replaces the previous AFTER DELETE trigger so
-- that the historical log always precedes the deletion, satisfying the requirement that
-- history insertion and allocation deletion happen in a single transaction with the
-- history record created first.

CREATE OR REPLACE FUNCTION public.log_alocacao_montagem_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.historico_alocacao_montagem (card_id, montador_id, acao)
  VALUES (OLD.card_id, OLD.montador_id, 'desalocado');
  RETURN OLD;
END;
$function$;

-- Replace the existing AFTER DELETE trigger with a BEFORE DELETE trigger.
-- CREATE OR REPLACE TRIGGER (PostgreSQL 14+) updates the existing trigger definition
-- in place, including its timing (AFTER -> BEFORE) while preserving the name.
CREATE OR REPLACE TRIGGER on_alocacao_montagem_delete
  BEFORE DELETE ON public.alocacao_montagem
  FOR EACH ROW EXECUTE FUNCTION public.log_alocacao_montagem_delete();

-- Keep the INSERT (alocado) trigger behavior intact and idempotent.
CREATE OR REPLACE FUNCTION public.log_alocacao_montagem_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.historico_alocacao_montagem (card_id, montador_id, acao)
  VALUES (NEW.card_id, NEW.montador_id, 'alocado');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE TRIGGER on_alocacao_montagem_insert
  AFTER INSERT ON public.alocacao_montagem
  FOR EACH ROW EXECUTE FUNCTION public.log_alocacao_montagem_insert();
