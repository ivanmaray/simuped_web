-- Migration: Tabla de invitaciones a sesiones programadas
CREATE TABLE IF NOT EXISTS public.scheduled_session_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.scheduled_sessions(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES auth.users(id),
  invited_email text NOT NULL,
  invited_name text,
  invited_role text,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | failed
  error_text text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scheduled_session_invites IS 'Invitaciones enviadas o programadas para sesiones';
COMMENT ON COLUMN public.scheduled_session_invites.invited_email IS 'Correo del invitado';

GRANT SELECT, INSERT ON public.scheduled_session_invites TO authenticated;
GRANT ALL ON public.scheduled_session_invites TO service_role;

CREATE INDEX IF NOT EXISTS scheduled_session_invites_session_id_idx ON public.scheduled_session_invites (session_id);
CREATE INDEX IF NOT EXISTS scheduled_session_invites_email_idx ON public.scheduled_session_invites (invited_email);

-- Enable RLS and a basic policy so authenticated users can insert when they are the inviter
ALTER TABLE public.scheduled_session_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_insert_by_inviter" ON public.scheduled_session_invites
  FOR INSERT TO authenticated
  WITH CHECK (inviter_id = auth.uid());
