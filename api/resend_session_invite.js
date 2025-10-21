import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function signPayload(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { session_id, user_id, session_name, session_date, session_location } = req.body || {};
  if (!session_id || !user_id) return res.status(400).json({ ok: false, error: 'Missing parameters' });

  const INVITE_SECRET = process.env.INVITE_TOKEN_SECRET;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!INVITE_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Server not configured' });

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { fetch });
    const { data: profile, error: profErr } = await sb.from('profiles').select('id, nombre, apellidos, email').eq('id', user_id).single();
    if (profErr || !profile) return res.status(404).json({ ok: false, error: 'profile_not_found' });

    const tokenPayload = { session_id, user_id, exp: Date.now() + (1000 * 60 * 60 * 24 * 7) };
    const sig = signPayload(tokenPayload, INVITE_SECRET);
    const token = Buffer.from(JSON.stringify({ payload: tokenPayload, sig })).toString('base64');
    const inviteLink = `${process.env.VITE_APP_URL || ''}/confirm-invite?token=${encodeURIComponent(token)}`;

    // Send email directly via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || 'notificaciones@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px;">
        <h3>Has sido invitado/a a una sesión de SimuPed</h3>
        <p>Hola ${[profile.nombre, profile.apellidos].filter(Boolean).join(' ') || ''},</p>
        <p>Te han invitado a la sesión: <strong>${session_name || 'Sesión programada'}</strong>.</p>
        <p>Fecha y hora: ${session_date ? new Date(session_date).toLocaleString('es-ES') : ''}</p>
        <p>Lugar: ${session_location || ''}</p>
        <p><a href="${inviteLink}" style="background:#1a69b8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Confirmar asistencia</a></p>
      </div>
    `;
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from, to: profile.email, subject: `Invitación: ${session_name || 'Sesión SimuPed'}`, html })
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => 'no-body');
      console.warn('[resend_session_invite] resend send failed', resp.status, errBody);
      return res.status(500).json({ ok: false, error: 'email_send_failed', detail: errBody });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[resend_session_invite] error', e);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}
