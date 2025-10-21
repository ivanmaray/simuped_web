import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { session_id, invites = [], inviter_id } = req.body || {};
    if (!session_id || !Array.isArray(invites)) return res.status(400).json({ ok: false, error: 'Faltan parámetros' });

    // Use service key if available to bypass RLS for insert/update
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.warn('[send_session_invites] missing supabase service key, attempting normal client');
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY, {});

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || 'notificaciones@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;

    const results = [];
    for (const inv of invites) {
      const email = (inv.email || inv.user_email || inv.invited_email || '').toString().trim();
      const name = (inv.name || inv.user_name || inv.invited_name || '').toString().trim();
      const role = (inv.role || inv.user_role || inv.invited_role || '').toString().trim();
      if (!email) {
        results.push({ email, ok: false, error: 'missing email' });
        continue;
      }

      // Insert invite record (status pending)
      try {
        const { data: created, error: insertErr } = await sb
          .from('scheduled_session_invites')
          .insert([{ session_id, inviter_id: inviter_id || null, invited_email: email, invited_name: name, invited_role: role }])
          .select()
          .single();
        if (insertErr) {
          console.warn('[send_session_invites] insert err', insertErr.message);
        }

        // Build email HTML
        const html = `
          <div style="font-family: Arial, sans-serif; max-width:600px;">
            <h3>Has sido invitado/a a una sesión de SimuPed</h3>
            <p>Estimado/a ${name || ''},</p>
            <p>Te invitamos a la sesión: <strong>${created?.title || 'Sesión programada'}</strong>.</p>
            <p>Fecha: ${created?.scheduled_at ? new Date(created.scheduled_at).toLocaleString('es-ES') : ''}</p>
            <p>Lugar: ${created?.location || ''}</p>
            <p>Si deseas asistir, accede a tu panel y confirma tu participación.</p>
          </div>
        `;

        // Send via Resend API
        let emailOk = false;
        let emailResp = null;
        try {
          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({ from, to: email, subject: `Invitación: sesión SimuPed`, html })
          });
          emailResp = await resp.json().catch(() => null);
          emailOk = resp.ok;
        } catch (e) {
          console.warn('[send_session_invites] resend error', e);
        }

        // Update invite row status
        try {
          await sb.from('scheduled_session_invites').update({ status: emailOk ? 'sent' : 'failed', error_text: emailOk ? null : JSON.stringify(emailResp || { error: 'send_failed' }), sent_at: emailOk ? new Date().toISOString() : null }).eq('session_id', session_id).eq('invited_email', email);
        } catch (e) {
          console.warn('[send_session_invites] update invite status error', e);
        }

        results.push({ email, ok: emailOk, resp: emailResp });
      } catch (e) {
        console.error('[send_session_invites] exception for', inv, e);
        results.push({ email: inv.email || '', ok: false, error: e.message || String(e) });
      }
    }

    return res.status(200).json({ ok: true, results });
  } catch (err) {
    console.error('[send_session_invites] error', err);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}
