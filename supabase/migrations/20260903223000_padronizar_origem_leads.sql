-- Migration: Padronização da origem dos leads e campo condicional origem_pessoa
-- Data: 2026-09-03
-- Aditiva, idempotente e não destrutiva

-- 1. Adicionar coluna aditiva origem_pessoa em leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS origem_pessoa TEXT;

-- 2. Preservar origem original em notas quando houver variação antes de normalizar
-- Se notas estiver vazia, salvamos a observação de auditoria
-- Se notas já tiver conteúdo, adicionamos ao final preservando o texto original
UPDATE public.leads
SET notas = CASE 
  WHEN notas IS NULL OR TRIM(notas) = '' THEN '[Origem anterior: ' || origem || ']'
  ELSE notas || E'\n[Origem anterior: ' || origem || ']'
END
WHERE origem IN (
  'WhatsApp - Indicação Arthur BNI',
  'WhatsApp - Indicação da cliente',
  'WhatsApp - indicação da Jordana da Santer Empreendimentos',
  'WhatsApp - Indicação de outros arquitetos',
  'WhatsApp - Indicação do Lauro',
  'WhatsApp - indicação',
  'WhatsApp - Indicação',
  'WhatsApp - Google',
  'WhatsApp - Google Maps',
  'WhatsApp - Instagram',
  'WhatsApp - Internet',
  'WhatsApp - GuiaFix',
  'WhatsApp - Já é Cliente',
  'WhatsApp - mensagem da Bender',
  'WhatsApp - site e propaganda da Rogga'
);

-- 3. Extrair nome da pessoa para os casos de indicação onde é possível identificar a pessoa
UPDATE public.leads
SET origem_pessoa = 'Arthur BNI'
WHERE origem = 'WhatsApp - Indicação Arthur BNI' AND (origem_pessoa IS NULL OR origem_pessoa = '');

UPDATE public.leads
SET origem_pessoa = 'Lauro'
WHERE origem = 'WhatsApp - Indicação do Lauro' AND (origem_pessoa IS NULL OR origem_pessoa = '');

UPDATE public.leads
SET origem_pessoa = 'Jordana (Santer Empreendimentos)'
WHERE origem = 'WhatsApp - indicação da Jordana da Santer Empreendimentos' AND (origem_pessoa IS NULL OR origem_pessoa = '');

UPDATE public.leads
SET origem_pessoa = 'Cliente'
WHERE origem = 'WhatsApp - Indicação da cliente' AND (origem_pessoa IS NULL OR origem_pessoa = '');

UPDATE public.leads
SET origem_pessoa = 'Outros arquitetos'
WHERE origem = 'WhatsApp - Indicação de outros arquitetos' AND (origem_pessoa IS NULL OR origem_pessoa = '');

-- Caso do lead cujo nome contém "(indicação Arq. Joana)"
UPDATE public.leads
SET origem_pessoa = 'Arq. Joana'
WHERE id = '9c6e2bbe-ce53-4917-b807-3d87d6d1bae3'::uuid AND (origem_pessoa IS NULL OR origem_pessoa = '');

-- 4. Normalizar variações para as origens padrão:
-- 4.1 Todas as variações com indicação / indicacao -> 'Indicação'
UPDATE public.leads
SET origem = 'Indicação'
WHERE (origem ILIKE '%indica%' OR origem ILIKE '%indicação%') AND origem <> 'Indicação';

-- 4.2 Variações de Google (ex: "WhatsApp - Google", "WhatsApp - Google Maps") -> 'Google'
UPDATE public.leads
SET origem = 'Google'
WHERE (origem ILIKE '%google%') AND origem <> 'Google';

-- 4.3 Variações de Instagram (ex: "WhatsApp - Instagram") -> 'Instagram'
UPDATE public.leads
SET origem = 'Instagram'
WHERE (origem ILIKE '%instagram%' OR origem ILIKE '%insta%') AND origem <> 'Instagram';

-- 4.4 Demais variações de WhatsApp que restaram ("WhatsApp - Internet", "WhatsApp - GuiaFix", etc.) -> 'WhatsApp'
UPDATE public.leads
SET origem = 'WhatsApp'
WHERE origem ILIKE 'whatsapp -%';
