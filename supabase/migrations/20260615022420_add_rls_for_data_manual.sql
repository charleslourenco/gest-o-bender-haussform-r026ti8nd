-- Ensure columns are explicitly accessible for authenticated users
GRANT SELECT, UPDATE (data_manual) ON public.produtos_servicos_projeto TO authenticated;
GRANT SELECT, UPDATE (data_manual) ON public.acompanhamentos TO authenticated;
