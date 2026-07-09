CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_finalize_envelope()
RETURNS trigger AS $function$
DECLARE
  doc_rec RECORD;
  v_req_id BIGINT;
  v_documento_id TEXT;
BEGIN
  IF NEW.status = 'assinado' AND (OLD.status IS DISTINCT FROM 'assinado') THEN
    FOR doc_rec IN
      SELECT id, arquivo_url, cliente_id
      FROM public.documentos_cliente
      WHERE envelope_id = NEW.id
    LOOP
      v_documento_id := COALESCE(doc_rec.arquivo_url, doc_rec.id::text);

      BEGIN
        SELECT net.http_post(
          url := 'https://igsdtxyopeiecpxwovgh.supabase.co/functions/v1/finalize-signature-document',
          headers := '{"Content-Type": "application/json"}'::jsonb,
          body := jsonb_build_object(
            'documento_id', v_documento_id,
            'envelope_id', NEW.id,
            'cliente_id', doc_rec.cliente_id
          )::jsonb
        ) INTO v_req_id;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.logs_ia (acao, detalhes)
        VALUES (
          'envelope_finalize_error',
          jsonb_build_object(
            'envelope_id', NEW.id,
            'documento_id', v_documento_id,
            'erro', SQLERRM
          )
        );
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_envelope_status_completed ON public.envelopes_assinatura;
CREATE TRIGGER on_envelope_status_completed
AFTER UPDATE ON public.envelopes_assinatura
FOR EACH ROW
EXECUTE FUNCTION public.trigger_finalize_envelope();

DROP POLICY IF EXISTS "envelopes_assinatura_update_authenticated" ON public.envelopes_assinatura;
CREATE POLICY "envelopes_assinatura_update_authenticated" ON public.envelopes_assinatura
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "documentos_cliente_update_authenticated" ON public.documentos_cliente;
CREATE POLICY "documentos_cliente_update_authenticated" ON public.documentos_cliente
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
