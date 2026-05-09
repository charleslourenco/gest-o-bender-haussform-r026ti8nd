CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_finalize_signature()
RETURNS trigger AS $function$
DECLARE
  pending_count INT;
  req_id BIGINT;
BEGIN
  IF NEW.status = 'assinado' AND (OLD.status IS DISTINCT FROM 'assinado') THEN
    SELECT count(*) INTO pending_count
    FROM public.assinaturas
    WHERE documento_id = NEW.documento_id AND status != 'assinado';

    IF pending_count = 0 THEN
      SELECT net.http_post(
        url := 'https://igsdtxyopeiecpxwovgh.supabase.co/functions/v1/finalize-signature-document',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'documento_id', NEW.documento_id,
          'cliente_id', NEW.cliente_id
        )::jsonb
      ) INTO req_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_signature_completed ON public.assinaturas;
CREATE TRIGGER on_signature_completed
AFTER UPDATE ON public.assinaturas
FOR EACH ROW
EXECUTE FUNCTION public.trigger_finalize_signature();
