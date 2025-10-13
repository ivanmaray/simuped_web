-- Migration: Sesiones programadas - PARTE 3
-- Triggers y funciones adicionales (idempotentes)

-- 6) Trigger para updated_at automático
DROP TRIGGER IF EXISTS handle_scheduled_sessions_updated_at ON public.scheduled_sessions;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER handle_scheduled_sessions_updated_at
    BEFORE UPDATE ON public.scheduled_sessions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7) Función para contar participantes inscritos (útil para queries)
DROP FUNCTION IF EXISTS public.get_session_participants_count(uuid);

CREATE OR REPLACE FUNCTION public.get_session_participants_count(session_id uuid)
RETURNS integer AS $$
BEGIN
    RETURN (SELECT COUNT(*) FROM public.scheduled_session_participants WHERE public.scheduled_session_participants.session_id = $1);
END;
$$ LANGUAGE 'plpgsql';
