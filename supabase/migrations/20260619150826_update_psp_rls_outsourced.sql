-- Make sure the policy exists to update outsourced_checked for authenticated users
DO $$
BEGIN
  -- Recreate policy to allow authenticated users to UPDATE outsourced_checked column
  DROP POLICY IF EXISTS "Enable update for outsourced_checked" ON public.produtos_servicos_projeto;
  
  CREATE POLICY "Enable update for outsourced_checked" 
    ON public.produtos_servicos_projeto 
    FOR UPDATE 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);
END $$;
