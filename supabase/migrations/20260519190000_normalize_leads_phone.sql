DO $$
DECLARE
  r RECORD;
  clean_phone TEXT;
BEGIN
  FOR r IN SELECT id, telefone FROM public.leads LOOP
    clean_phone := regexp_replace(r.telefone, '\D', '', 'g');
    
    IF clean_phone LIKE '55%' AND length(clean_phone) = 12 THEN
      clean_phone := substr(clean_phone, 1, 4) || '9' || substr(clean_phone, 5);
    ELSIF clean_phone NOT LIKE '55%' THEN
      IF length(clean_phone) = 10 THEN
        clean_phone := '55' || substr(clean_phone, 1, 2) || '9' || substr(clean_phone, 3);
      ELSIF length(clean_phone) = 11 THEN
        clean_phone := '55' || clean_phone;
      END IF;
    END IF;

    IF clean_phone != r.telefone THEN
      UPDATE public.leads SET telefone = clean_phone WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
