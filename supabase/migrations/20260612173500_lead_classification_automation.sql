-- Migration: Automated Lead Classification based on initial message
-- Date: 2026-06-12

CREATE OR REPLACE FUNCTION public.classify_lead_conversation()
RETURNS trigger AS $$
DECLARE
    message TEXT := COALESCE(NEW.notas, '');
    matched_category TEXT := NULL;
    confidence INT := 0;
    phone_clean TEXT;
    is_internal BOOLEAN := FALSE;
    
    rh_matches INT := 0;
    forn_matches INT := 0;
    sup_matches INT := 0;
    atend_matches INT := 0;
    
    words_array TEXT[];
    total_words INT := 0;
BEGIN
    -- If already classified manually, respect it
    IF NEW.tipo_conversa IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Clean phone number for internal check
    phone_clean := regexp_replace(COALESCE(NEW.telefone, ''), '\D', '', 'g');

    -- Check if it belongs to internal team
    IF length(phone_clean) >= 10 THEN
        SELECT EXISTS (
            SELECT 1 FROM public.users u WHERE regexp_replace(COALESCE(u.telefone, ''), '\D', '', 'g') = phone_clean
            UNION ALL
            SELECT 1 FROM public.equipe_clt e WHERE regexp_replace(COALESCE(e.telefone, ''), '\D', '', 'g') = phone_clean
        ) INTO is_internal;
    END IF;

    -- Count occurrences for each category
    SELECT count(*) INTO rh_matches FROM regexp_matches(message, '\y(curr[ií]culo|cv|experi[eê]ncia|trabalho|emprego)\y', 'ig');
    SELECT count(*) INTO forn_matches FROM regexp_matches(message, '\y(vender|fornecedor|produto|pre[cç]o|tabela|or[cç]amento)\y', 'ig');
    SELECT count(*) INTO sup_matches FROM regexp_matches(message, '\y(d[uú]vida|como|qual|problema|n[aã]o funciona)\y', 'ig');
    SELECT count(*) INTO atend_matches FROM regexp_matches(message, '\y(j[aá] [eé] cliente|pedido|entrega|fatura|nota fiscal)\y', 'ig');
    
    words_array := regexp_split_to_array(trim(message), '\s+');
    total_words := array_length(words_array, 1);
    IF total_words IS NULL OR trim(message) = '' THEN 
        total_words := 0; 
    END IF;

    -- Prioritized decision tree
    IF rh_matches > 0 THEN
        matched_category := 'RH';
        confidence := LEAST(100, 60 + (rh_matches * 20));
    ELSIF forn_matches > 0 THEN
        matched_category := 'Fornecedor';
        confidence := LEAST(100, 60 + (forn_matches * 20));
    ELSIF sup_matches > 0 AND is_internal THEN
        matched_category := 'Suporte Interno';
        confidence := LEAST(100, 70 + (sup_matches * 15));
    ELSIF atend_matches > 0 THEN
        matched_category := 'Atendimento';
        confidence := LEAST(100, 60 + (atend_matches * 20));
    ELSE
        -- Default Fallback
        IF total_words > 0 THEN
            matched_category := 'Lead Comercial';
            confidence := 75; -- High enough to pass threshold
        ELSE
            confidence := 0; -- Empty message, low confidence
        END IF;
    END IF;

    -- Threshold validation
    IF confidence >= 70 THEN
        NEW.tipo_conversa := matched_category;
    ELSE
        NEW.tipo_conversa := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate Trigger
DROP TRIGGER IF EXISTS trg_classify_lead_conversation ON public.leads;
CREATE TRIGGER trg_classify_lead_conversation
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.classify_lead_conversation();
