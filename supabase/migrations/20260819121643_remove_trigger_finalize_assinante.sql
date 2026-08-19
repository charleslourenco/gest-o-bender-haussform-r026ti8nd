-- Remove os triggers e a função trigger_finalize_assinante()
--
-- Contexto: o trigger_finalize_assinante marcava TODAS as assinaturas de um
-- mesmo email no envelope como "assinado" assim que UM assinante assinava,
-- fazendo o cliente pular etapas (visualização, desenho, confirmação de cada
-- documento). Os componentes de frontend já finalizam cada assinatura
-- individualmente, portanto este trigger é redundante e causa bug.
--
-- Não mexe em: trigger_finalize_signature, trigger_finalize_envelope.

-- 1. Remove os 2 gatilhos na tabela assinantes
DROP TRIGGER IF EXISTS on_assinante_finalize ON public.assinantes;
DROP TRIGGER IF EXISTS on_assinante_signed ON public.assinantes;

-- 2. Remove a função que os triggers chamavam
DROP FUNCTION IF EXISTS public.trigger_finalize_assinante();
