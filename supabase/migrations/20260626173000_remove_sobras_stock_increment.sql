-- Remove any potential triggers that automatically incremented main stock from sobras
-- This fulfills the database consistency requirement for the inventory logic correction
DROP TRIGGER IF EXISTS trg_increment_stock_from_sobras ON public.estoque_sobras;
DROP TRIGGER IF EXISTS increment_stock_on_sobra ON public.estoque_sobras;
DROP FUNCTION IF EXISTS public.increment_stock_from_sobras();
DROP FUNCTION IF EXISTS public.update_stock_from_sobras();
