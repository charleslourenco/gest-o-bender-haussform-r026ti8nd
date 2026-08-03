CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_finalize_signature()
RETURNS trigger AS $$
DECLARE
  v_envelope_id UUID;
  v_total_assinantes INT;
  v_signed_assinantes INT;
  v_pending_assinaturas INT;
  v_req_id BIGINT;
BEGIN
  IF NEW.status = 'assinado' AND (OLD.status IS DISTINCT FROM 'assinado') THEN
    SELECT envelope_id INTO v_envelope_id
    FROM public.documentos_cliente
    WHERE arquivo_url = NEW.documento_id OR id::text = NEW.documento_id
    LIMIT 1;

    IF v_envelope_id IS NULL THEN
      SELECT envelope_id INTO v_envelope_id
      FROM public.documentos_equipe
      WHERE arquivo_url = NEW.documento_id OR id::text = NEW.documento_id
      LIMIT 1;
    END IF;

    IF v_envelope_id IS NULL THEN
      SELECT id INTO v_envelope_id
      FROM public.envelopes_assinatura
      WHERE documento_id = NEW.documento_id
      LIMIT 1;
    END IF;

    IF v_envelope_id IS NOT NULL THEN
      UPDATE public.assinantes
      SET
        status = 'assinado',
        assinado_em = COALESCE(assinado_em, NEW.data_assinatura, NOW()),
        assinatura_base64 = COALESCE(assinatura_base64, NEW.assinatura_imagem),
        ip_address = COALESCE(ip_address, NEW.ip_assinatura)
      WHERE envelope_id = v_envelope_id
        AND email IS NOT NULL
        AND lower(email) = lower(NEW.signatario_email)
        AND status != 'assinado';

      SELECT COUNT(*) INTO v_total_assinantes
      FROM public.assinantes
      WHERE envelope_id = v_envelope_id;

      SELECT COUNT(*) INTO v_signed_assinantes
      FROM public.assinantes
      WHERE envelope_id = v_envelope_id AND status = 'assinado';

      SELECT COUNT(*) INTO v_pending_assinaturas
      FROM public.assinaturas a
      WHERE a.status != 'assinado'
        AND (
          EXISTS (
            SELECT 1 FROM public.documentos_cliente dc
            WHERE dc.envelope_id = v_envelope_id
            AND (dc.arquivo_url = a.documento_id OR dc.id::text = a.documento_id)
          )
          OR EXISTS (
            SELECT 1 FROM public.documentos_equipe de
            WHERE de.envelope_id = v_envelope_id
            AND (de.arquivo_url = a.documento_id OR de.id::text = a.documento_id)
          )
        );

      IF v_total_assinantes > 0 AND v_signed_assinantes = v_total_assinantes AND v_pending_assinaturas = 0 THEN
        UPDATE public.envelopes_assinatura
        SET status = 'concluido', concluido_em = NOW()
        WHERE id = v_envelope_id AND status != 'concluido';
      END IF;
    ELSE
      SELECT net.http_post(
        url := 'https://igsdtxyopeiecpxwovgh.supabase.co/functions/v1/finalize-signature-document',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'documento_id', NEW.documento_id,
          'cliente_id', NEW.cliente_id
        )::jsonb
      ) INTO v_req_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trigger_finalize_assinante()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'assinado' AND (OLD.status IS DISTINCT FROM 'assinado') THEN
    UPDATE public.assinaturas
    SET
      status = 'assinado',
      data_assinatura = COALESCE(data_assinatura, NEW.assinado_em, NOW()),
      assinatura_imagem = COALESCE(assinatura_imagem, NEW.assinatura_base64),
      ip_assinatura = COALESCE(ip_assinatura, NEW.ip_address),
      signatario_nome = COALESCE(signatario_nome, NEW.nome_completo),
      signatario_cpf = COALESCE(signatario_cpf, NEW.cpf)
    WHERE signatario_email IS NOT NULL
      AND lower(signatario_email) = lower(NEW.email)
      AND status != 'assinado'
      AND (
        documento_id IN (
          SELECT arquivo_url FROM public.documentos_cliente WHERE envelope_id = NEW.envelope_id
        )
        OR documento_id IN (
          SELECT id::text FROM public.documentos_cliente WHERE envelope_id = NEW.envelope_id
        )
        OR documento_id IN (
          SELECT arquivo_url FROM public.documentos_equipe WHERE envelope_id = NEW.envelope_id
        )
        OR documento_id IN (
          SELECT id::text FROM public.documentos_equipe WHERE envelope_id = NEW.envelope_id
        )
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_signature_completed ON public.assinaturas;
CREATE TRIGGER on_signature_completed
AFTER UPDATE ON public.assinaturas
FOR EACH ROW EXECUTE FUNCTION public.trigger_finalize_signature();

DROP TRIGGER IF EXISTS on_assinante_signed ON public.assinantes;
DROP TRIGGER IF EXISTS on_assinante_completed ON public.assinantes;
DROP TRIGGER IF EXISTS trigger_finalize_assinante ON public.assinantes;
CREATE TRIGGER on_assinante_signed
AFTER UPDATE ON public.assinantes
FOR EACH ROW EXECUTE FUNCTION public.trigger_finalize_assinante();

DROP POLICY IF EXISTS "documentos_equipe_select_anon" ON public.documentos_equipe;
CREATE POLICY "documentos_equipe_select_anon" ON public.documentos_equipe
  FOR SELECT TO anon USING (envelope_id IS NOT NULL);

DROP POLICY IF EXISTS "documentos_equipe_update_anon" ON public.documentos_equipe;
CREATE POLICY "documentos_equipe_update_anon" ON public.documentos_equipe
  FOR UPDATE TO anon USING (envelope_id IS NOT NULL) WITH CHECK (envelope_id IS NOT NULL);
