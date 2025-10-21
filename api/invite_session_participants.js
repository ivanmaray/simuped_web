import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function signPayload(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { session_id, user_ids = [], inviter_id } = req.body || {};
    if (!session_id || !Array.isArray(user_ids)) return res.status(400).json({ ok: false, error: 'Missing parameters' });

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Missing supabase service key' });

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { fetch });

    const INVITE_SECRET = process.env.INVITE_TOKEN_SECRET;
    if (!INVITE_SECRET) return res.status(500).json({ ok: false, error: 'Missing INVITE_TOKEN_SECRET' });

    const results = [];
    for (const uid of user_ids) {
      try {
        // Insert participant row as invited (confirmed_at = null)
        const { error: insertErr } = await sb.from('scheduled_session_participants').insert([{ session_id, user_id: uid, registered_at: new Date().toISOString(), confirmed_at: null }]);
        if (insertErr) {
          // If duplicate, ignore and continue
          if (insertErr.code === '23505') {
            results.push({ user_id: uid, ok: false, error: 'already_exists' });
            continue;
          }
          results.push({ user_id: uid, ok: false, error: insertErr.message });
          continue;
        }

        // Fetch profile to get email and name
        const { data: profiles, error: profErr } = await sb.from('profiles').select('id, nombre, apellidos, email').eq('id', uid).single();
        if (profErr || !profiles) {
          results.push({ user_id: uid, ok: false, error: 'profile_not_found' });
          continue;
        }

        const userEmail = profiles.email;
        const userName = [profiles.nombre, profiles.apellidos].filter(Boolean).join(' ') || 'Usuario';
        // Build signed token for one-click confirmation
        const tokenPayload = { session_id, user_id: uid, exp: Date.now() + (1000 * 60 * 60 * 24 * 7) }; // 7 days
        const sig = signPayload(tokenPayload, INVITE_SECRET);
        const token = Buffer.from(JSON.stringify({ payload: tokenPayload, sig })).toString('base64');

        // Send invitation email directly via Resend API
        try {
          const RESEND_API_KEY = process.env.RESEND_API_KEY;
          const MAIL_FROM = process.env.MAIL_FROM || 'notificaciones@simuped.com';
          const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
          const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;
          const inviteLink = `${process.env.VITE_APP_URL || ''}/confirm-invite?token=${encodeURIComponent(token)}`;

          const html = `
            <div style="font-family: Arial, sans-serif; max-width:600px;">
              <h3>Has sido invitado/a a una sesión de SimuPed</h3>
              <p>Hola ${userName || ''},</p>
              <p>Te han invitado a la sesión: <strong>${req.body.session_name || 'Sesión programada'}</strong>.</p>
              <p>Fecha y hora: ${req.body.session_date ? new Date(req.body.session_date).toLocaleString('es-ES') : ''}</p>
              <p>Lugar: ${req.body.session_location || ''}</p>
              <p><a href="${inviteLink}" style="background:#1a69b8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Confirmar asistencia</a></p>
              <p>Si ya te has apuntado, puedes ignorar este correo.</p>
            </div>
          `;

          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({ from, to: userEmail, subject: `Invitación: ${req.body.session_name || 'Sesión SimuPed'}`, html })
          });
          if (!resp.ok) {
            const errBody = await resp.text().catch(() => 'no-body');
            console.warn('[invite_session_participants] resend send failed', resp.status, errBody);
            results.push({ user_id: uid, ok: false, error: 'email_send_failed', detail: errBody });
            continue;
          }
        } catch (e) {
          console.warn('[invite_session_participants] email error', e);
          results.push({ user_id: uid, ok: false, error: 'email_exception', detail: String(e) });
          continue;
        }
        results.push({ user_id: uid, ok: true });
      } catch (e) {
        console.error('[invite_session_participants] error', e);
        results.push({ user_id: uid, ok: false, error: String(e) });
      }
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error('[invite_session_participants] error', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}
