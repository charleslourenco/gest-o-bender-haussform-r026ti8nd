-- Migration to fix check_envelope_completion trigger
-- Ensures that an envelope is ONLY completed if ALL assinantes have signed AND ALL assinaturas
-- across all linked documents (documentos_cliente and documentos_equipe) are also signed.

CREATE OR REPLACE FUNCTION public.check_envelope_completion()
RETURNS trigger AS $$
DECLARE
  v_total_assinantes INT;
  v_signed_assinantes INT;
  v_pending_assinaturas INT;
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido') THEN
    -- 1. Verifica contagem de assinantes do envelope
    SELECT COUNT(*) INTO v_total_assinantes
    FROM public.assinantes
    WHERE envelope_id = NEW.id;

    SELECT COUNT(*) INTO v_signed_assinantes
    FROM public.assinantes
    WHERE envelope_id = NEW.id AND status = 'assinado';

    -- Se existem assinantes e nem todos assinaram, impede a conclusão
    IF v_total_assinantes > 0 AND v_signed_assinantes < v_total_assinantes THEN
      NEW.status := COALESCE(OLD.status, 'aguardando');
      NEW.concluido_em := NULL;
      RETURN NEW;
    END IF;

    -- 2. Verifica se existem assinaturas pendentes em documentos vinculados a este envelope
    SELECT COUNT(*) INTO v_pending_assinaturas
    FROM public.assinaturas a
    WHERE a.status != 'assinado'
      AND (
        EXISTS (
          SELECT 1 FROM public.documentos_cliente dc
          WHERE dc.envelope_id = NEW.id
          AND (dc.arquivo_url = a.documento_id OR dc.id::text = a.documento_id)
        )
        OR EXISTS (
          SELECT 1 FROM public.documentos_equipe de
          WHERE de.envelope_id = NEW.id
          AND (de.arquivo_url = a.documento_id OR de.id::text = a.documento_id)
        )
        OR a.documento_id = NEW.documento_id
      );

    IF v_pending_assinaturas > 0 THEN
      NEW.status := COALESCE(OLD.status, 'aguardando');
      NEW.concluido_em := NULL;
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger idempotently
DROP TRIGGER IF EXISTS before_envelope_completion_check ON public.envelopes_assinatura;
CREATE TRIGGER before_envelope_completion_check
BEFORE UPDATE ON public.envelopes_assinatura
FOR EACH ROW EXECUTE FUNCTION public.check_envelope_completion();
