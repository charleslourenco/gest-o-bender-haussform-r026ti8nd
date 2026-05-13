DO $block$
BEGIN
    -- Delete records from application tables, removing test data while preserving configuration, users and templates
    DELETE FROM public.timeline_eventos;
    DELETE FROM public.kanban_historico;
    DELETE FROM public.produtos_servicos_projeto;
    DELETE FROM public.produtos_servicos;
    DELETE FROM public.parcelas;
    DELETE FROM public.pagamentos;
    DELETE FROM public.contas_receber;
    DELETE FROM public.contas_pagar;
    DELETE FROM public.documentos_cliente;
    DELETE FROM public.documentos_gerados;
    DELETE FROM public.assinaturas;
    DELETE FROM public.assinantes;
    DELETE FROM public.envelopes_assinatura;
    DELETE FROM public.dossies;
    DELETE FROM public.formulario_comercial;
    DELETE FROM public.clientes;
    DELETE FROM public.whatsapp_sessions;
    DELETE FROM public.leads;
    DELETE FROM public.listas_materiais;
    DELETE FROM public.ambientes;

    -- Clean up related files from storage buckets used for clients/dossiers/financeiro
    DELETE FROM storage.objects WHERE bucket_id IN ('bender_clientes', 'dossiers', 'financeiro');
END $block$;
