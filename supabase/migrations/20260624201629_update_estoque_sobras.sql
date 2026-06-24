DO $$
BEGIN
    ALTER TABLE public.estoque_sobras ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'retalho'::text;
    ALTER TABLE public.estoque_sobras ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.estoque_itens(id) ON DELETE SET NULL;
END $$;
