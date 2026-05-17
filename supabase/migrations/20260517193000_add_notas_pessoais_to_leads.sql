-- Add notas_pessoais column to separate user notes from Catarina chat history
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS notas_pessoais TEXT;
