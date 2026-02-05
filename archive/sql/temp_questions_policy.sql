-- Política temporal para questions (similar a case_resources)
-- Permitir operaciones a usuarios autenticados para testing
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS questions_temp_write ON public.questions;
CREATE POLICY questions_temp_write ON public.questions
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');