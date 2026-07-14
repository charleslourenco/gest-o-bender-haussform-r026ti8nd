CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_finalize_envelope()
RETURNS trigger AS $$
DECLARE
  v_req_id BIGINT;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    BEGIN
      SELECT net.http_post(
        url := 'https://igsdtxyopeiecpxwovgh.supabase.co/functions/v1/finalize-signature-document',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := jsonb_build_object(
          'envelope_id', NEW.id
        )::jsonb
      ) INTO v_req_id;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.logs_ia (acao, detalhes)
      VALUES (
        'envelope_finalize_error',
        jsonb_build_object(
          'envelope_id', NEW.id,
          'erro', SQLERRM
        )
      );
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_envelope_status_completed ON public.envelopes_assinatura;
CREATE TRIGGER on_envelope_status_completed
AFTER UPDATE ON public.envelopes_assinatura
FOR EACH ROW
EXECUTE FUNCTION public.trigger_finalize_envelope();
