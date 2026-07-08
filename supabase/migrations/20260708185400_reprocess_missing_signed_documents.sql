-- Backend reprocessing mechanism for signed documents missing their final PDF URL.
-- Identifies documentos_cliente rows marked as signed/completed but without arquivo_assinado_url
-- and triggers the finalize-signature-document Edge Function to recover the final PDF.
-- Idempotent: safe to run multiple times (edge function itself skips already-finalized docs).

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.reprocess_missing_signed_documents()
RETURNS TABLE(
  documentos_cliente_id uuid,
  documento_id text,
  envelope_id uuid,
  cliente_id uuid,
  estado text,
  http_req_id bigint,
  erro text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  rec RECORD;
  v_req_id BIGINT;
  v_payload JSONB;
BEGIN
  FOR rec IN
    SELECT
      dc.id            AS doc_id,
      dc.arquivo_url   AS arquivo_url,
      dc.envelope_id   AS envelope_id,
      dc.cliente_id    AS cliente_id,
      dc.template_id   AS template_id
    FROM public.documentos_cliente dc
    WHERE
      LOWER(COALESCE(dc.status, '')) IN ('assinado', 'concluido', 'concluído', 'signed', 'completed')
      AND (dc.arquivo_assinado_url IS NULL OR dc.arquivo_assinado_url = '')
      AND dc.arquivo_url IS NOT NULL
      AND dc.arquivo_url <> ''
  LOOP
    v_payload := jsonb_build_object(
      'documento_id', rec.arquivo_url,
      'cliente_id',   rec.cliente_id,
      'envelope_id',  rec.envelope_id,
      'manual',       true
    );

    BEGIN
      SELECT net.http_post(
        url     := 'https://igsdtxyopeiecpxwovgh.supabase.co/functions/v1/finalize-signature-document',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body    := v_payload
      ) INTO v_req_id;

      INSERT INTO public.logs_ia (acao, detalhes)
      VALUES (
        'reprocess_missing_signed_doc',
        jsonb_build_object(
          'documentos_cliente_id', rec.doc_id,
          'documento_id',          rec.arquivo_url,
          'envelope_id',           rec.envelope_id,
          'cliente_id',            rec.cliente_id,
          'template_id',           rec.template_id,
          'http_req_id',           v_req_id
        )
      );

      documentos_cliente_id := rec.doc_id;
      documento_id          := rec.arquivo_url;
      envelope_id           := rec.envelope_id;
      cliente_id            := rec.cliente_id;
      estado                := 'triggered';
      http_req_id           := v_req_id;
      erro                  := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.logs_ia (acao, detalhes)
      VALUES (
        'reprocess_missing_signed_doc_error',
        jsonb_build_object(
          'documentos_cliente_id', rec.doc_id,
          'documento_id',          rec.arquivo_url,
          'envelope_id',           rec.envelope_id,
          'cliente_id',            rec.cliente_id,
          'template_id',           rec.template_id,
          'erro',                  SQLERRM
        )
      );

      documentos_cliente_id := rec.doc_id;
      documento_id          := rec.arquivo_url;
      envelope_id           := rec.envelope_id;
      cliente_id            := rec.cliente_id;
      estado                := 'error';
      http_req_id           := NULL;
      erro                  := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$function$;

-- Run the reprocessing once for currently inconsistent records.
-- Re-running this migration (or the function) is safe due to edge function idempotency.
SELECT * FROM public.reprocess_missing_signed_documents();
