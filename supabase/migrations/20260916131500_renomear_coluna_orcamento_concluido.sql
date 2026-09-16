-- Migração para renomear coluna "Encaminhado" para "Orçamento Concluido" na aba Leads p/ Orçamentos (lead-orcamentos)
-- Atualizar registros existentes no banco de dados que possuem status 'Encaminhado' na categoria Orçamento ou direcionados para lead-orcamentos
UPDATE public.leads
SET status = 'Orçamento Concluido',
    atualizado_em = NOW()
WHERE status = 'Encaminhado'
  AND (
    categoria ILIKE '%orçamento%' 
    OR categoria ILIKE '%orcamento%'
    OR notas_pessoais ILIKE '%"encaminhado_para_aba":"lead-orcamentos"%'
  );
