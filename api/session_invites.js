import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fetch from 'node-fetch';

function signPayload(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

function verifyToken(tokenBase64, secret) {
  try {
    const decoded = JSON.parse(Buffer.from(tokenBase64, 'base64').toString('utf8'));
    const { payload, sig } = decoded;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    const expected = hmac.digest('hex');
    if (expected !== sig) return { ok: false, error: 'invalid_signature' };
    if (payload.exp && Date.now() > payload.exp) return { ok: false, error: 'expired' };
    return { ok: true, payload };
  } catch (e) {
    return { ok: false, error: 'invalid_token' };
  }
}

function formatInviteDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return value;
  }
}

function getAppBaseUrl() {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.VITE_APP_URL
  ];
  const canonical = (process.env.CANONICAL_SITE_URL || 'https://www.simuped.com').replace(/\/$/, '');
  for (const value of candidates) {
    if (value && typeof value === 'string') {
      return value.replace(/\/$/, '');
    }
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && typeof vercelUrl === 'string') {
    const sanitized = vercelUrl.replace(/\/$/, '');
    const candidate = sanitized.startsWith('http') ? sanitized : `https://${sanitized}`;
    if (!/vercel\.app$/i.test(new URL(candidate).hostname)) {
      return candidate.replace(/\/$/, '');
    }
    return canonical;
  }
  if (process.env.NODE_ENV === 'production') return canonical;
  return 'http://localhost:5173';
}

function getAssetBaseUrl(appBaseUrl) {
  const candidates = [
    process.env.ASSET_BASE_URL,
    process.env.CDN_URL,
    process.env.VITE_ASSET_URL
  ];
  for (const value of candidates) {
    if (value && typeof value === 'string') {
      return value.replace(/\/$/, '');
    }
  }
  return appBaseUrl;
}

function getLogoUrl(appBaseUrl, assetBaseUrl) {
  const candidates = [
    process.env.LOGO_URL,
    process.env.VITE_LOGO_URL,
    `${assetBaseUrl}/logo-simuped-Dtpd4WLf.avif`,
    `${appBaseUrl}/logo-simuped-Dtpd4WLf.avif`
  ];
  for (const value of candidates) {
    if (value && typeof value === 'string') {
      return value;
    }
  }
  return null;
}

function buildInviteEmail({ userName, sessionName, sessionDate, sessionLocation, inviteLink, logoUrl, supportEmail }) {
  const formattedDate = formatInviteDate(sessionDate);
  return `
  <div style="background-color:#f5f7fb;padding:32px 0;margin:0;font-family:'Segoe UI',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 15px 40px rgba(15,23,42,0.12);">
      <tr>
        <td style="background:linear-gradient(135deg,#0A3D91,#1E6ACB);padding:32px;text-align:center;color:#ffffff;">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="SimuPed" style="width:120px;max-width:100%;display:block;margin:0 auto 12px;" />
               <div style="font-size:18px;font-weight:600;letter-spacing:0.3px;">Simulación Pediátrica</div>`
            : '<div style="font-size:26px;font-weight:700;letter-spacing:0.4px;">SimuPed</div>'}
          <div style="margin-top:6px;font-size:15px;opacity:0.85;">Hospital Universitario Central de Asturias</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px;color:#1f2937;">
          <p style="margin:0;font-size:16px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Invitación confirmable</p>
          <h1 style="margin:12px 0 20px;font-size:24px;color:#0f172a;">Has sido invitado/a a una sesión de SimuPed</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hola ${userName || ''},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Te han invitado a la sesión <strong style="color:#0A3D91;">${sessionName || 'Sesión programada'}</strong>. Revisa los detalles y confirma tu asistencia:</p>

          <div style="margin:20px 0;padding:20px 24px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
            <p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📅 Fecha y hora:</strong><br>${formattedDate || 'Por confirmar'}</p>
            <p style="margin:0;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📍 Lugar:</strong><br>${sessionLocation || 'Pendiente de determinar'}</p>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="${inviteLink}" style="display:inline-block;background:#0A3D91;color:#ffffff;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 10px 25px rgba(10,61,145,0.35);">Confirmar asistencia</a>
          </div>

          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;">Si ya te has apuntado, puedes ignorar este correo. Quedan plazas limitadas; confirma tu participación para asegurar tu asiento.</p>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">Si el botón no funciona, copia y pega esta dirección en tu navegador:<br><span style="color:#0A3D91;word-break:break-all;">${inviteLink}</span></p>
          <p style="margin:16px 0 12px;font-size:14px;line-height:1.6;color:#475569;">Recomendamos llegar con 10 minutos de antelación para preparar el material. Si necesitas modificar tu asistencia, puedes gestionarlo desde tu panel.</p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">¿Dudas? Escríbenos a <a href="mailto:${supportEmail || 'contacto@simuped.com'}" style="color:#0A3D91;text-decoration:none;">${supportEmail || 'contacto@simuped.com'}</a>.</p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#f1f5f9;padding:20px 32px;text-align:center;color:#64748b;font-size:13px;">
          <p style="margin:0 0 6px;">Equipo SimuPed · UCI Pediátrica & UGC Farmacia HUCA</p>
          <p style="margin:0;font-size:12px;opacity:0.75;">Este mensaje se envió automáticamente desde la plataforma SimuPed.</p>
        </td>
      </tr>
    </table>
  </div>
  `;
}

export default async function handler(req, res) {
  const action = req.query.action || req.body?.action;

  if (!action) {
    return res.status(400).json({ ok: false, error: 'missing_action' });
  }

  switch (action) {
    case 'send':
      return await handleSendInvites(req, res);
    case 'resend':
      return await handleResendInvite(req, res);
    case 'invite_participants':
      return await handleInviteParticipants(req, res);
    case 'confirm':
      return await handleConfirmInvite(req, res);
    default:
      return res.status(400).json({ ok: false, error: 'invalid_action' });
  }
}

async function handleSendInvites(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { session_id, invites = [], inviter_id } = req.body || {};
    if (!session_id || !Array.isArray(invites)) return res.status(400).json({ ok: false, error: 'Faltan parámetros' });

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

      try {
        const { data: created, error: insertErr } = await sb
          .from('scheduled_session_invites')
          .insert([{ session_id, inviter_id: inviter_id || null, invited_email: email, invited_name: name, invited_role: role }])
          .select()
          .single();
        if (insertErr) {
          console.warn('[send_session_invites] insert err', insertErr.message);
        }

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

        try {
          await sb.from('scheduled_session_invites').update({
            status: emailOk ? 'sent' : 'failed',
            error_text: emailOk ? null : JSON.stringify(emailResp || { error: 'send_failed' }),
            sent_at: emailOk ? new Date().toISOString() : null
          }).eq('session_id', session_id).eq('invited_email', email);
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

async function handleResendInvite(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { session_id, user_id, session_name, session_date, session_location } = req.body || {};
  if (!session_id || !user_id) return res.status(400).json({ ok: false, error: 'missing_parameters' });

  const INVITE_SECRET = process.env.INVITE_TOKEN_SECRET || process.env.INVITE_FALLBACK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!INVITE_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[resend_session_invite] Missing configuration');
    return res.status(500).json({ ok: false, error: 'server_not_configured' });
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { fetch });
    const { data: profile, error: profErr } = await sb.from('profiles').select('id, nombre, apellidos, email').eq('id', user_id).single();
    if (profErr || !profile) return res.status(404).json({ ok: false, error: 'profile_not_found' });

    const tokenPayload = { session_id, user_id, exp: Date.now() + (1000 * 60 * 60 * 24 * 7) };
    const sig = signPayload(tokenPayload, INVITE_SECRET);
    const token = Buffer.from(JSON.stringify({ payload: tokenPayload, sig })).toString('base64');
    const baseUrl = getAppBaseUrl();
    const assetBaseUrl = getAssetBaseUrl(baseUrl);
    const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || 'contacto@simuped.com';
    const inviteLink = `${baseUrl}/confirm-invite?token=${encodeURIComponent(token)}`;

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || 'notifications@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;
    const html = buildInviteEmail({
      userName: [profile.nombre, profile.apellidos].filter(Boolean).join(' '),
      sessionName: session_name,
      sessionDate: session_date,
      sessionLocation: session_location,
      inviteLink,
      logoUrl,
      supportEmail
    });

    if (!RESEND_API_KEY) {
      console.error('[resend_session_invite] Missing RESEND_API_KEY');
      return res.status(500).json({ ok: false, error: 'missing_resend_api_key' });
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from, to: profile.email, subject: `Invitación: ${session_name || 'Sesión SimuPed'}`, html })
    });
    const respText = await resp.text().catch(() => null);
    let respJson = null;
    try { respJson = respText ? JSON.parse(respText) : null; } catch (e) { respJson = null; }
    if (!resp.ok) {
      console.warn('[resend_session_invite] resend send failed', resp.status, respText);
      return res.status(500).json({ ok: false, error: 'email_send_failed', detail: respText, status: resp.status, resend: respJson });
    }
    console.log('[resend_session_invite] resend send success', resp.status, respJson);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[resend_session_invite] error', e);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}

async function handleInviteParticipants(req, res) {
  // This would contain the logic from invite_session_participants.js
  // For now, return not implemented
  return res.status(501).json({ ok: false, error: 'not_implemented_yet' });
}

async function handleConfirmInvite(req, res) {
  const INVITE_SECRET = process.env.INVITE_TOKEN_SECRET || process.env.INVITE_FALLBACK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!INVITE_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).send('Server not configured');

  try {
    let token = null;
    if (req.method === 'GET') {
      token = req.query.token;
      if (!token) return res.status(400).send('Missing token');
    } else if (req.method === 'POST') {
      token = req.body?.token;
      if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });
    } else {
      return res.status(405).send('Method not allowed');
    }

    const verification = verifyToken(token, INVITE_SECRET);
    if (!verification.ok) {
      if (req.method === 'GET') return res.status(400).send(`Invalid token: ${verification.error}`);
      return res.status(400).json({ ok: false, error: verification.error });
    }

    const { session_id, user_id } = verification.payload;
    if (!session_id || !user_id) {
      if (req.method === 'GET') return res.status(400).send('Invalid token payload');
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {});

    // Check if invite exists and is still valid
    const { data: invite, error: inviteErr } = await sb
      .from('scheduled_session_invites')
      .select('*')
      .eq('session_id', session_id)
      .eq('invited_user_id', user_id)
      .single();

    if (inviteErr || !invite) {
      if (req.method === 'GET') return res.status(404).send('Invite not found');
      return res.status(404).json({ ok: false, error: 'invite_not_found' });
    }

    if (invite.status === 'confirmed') {
      if (req.method === 'GET') return res.status(200).send('Already confirmed');
      return res.status(200).json({ ok: true, message: 'already_confirmed' });
    }

    if (invite.status === 'cancelled') {
      if (req.method === 'GET') return res.status(400).send('Invite cancelled');
      return res.status(400).json({ ok: false, error: 'invite_cancelled' });
    }

    // Update invite status
    const { error: updateErr } = await sb
      .from('scheduled_session_invites')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('session_id', session_id)
      .eq('invited_user_id', user_id);

    if (updateErr) {
      console.error('[confirm_session_invite] update error', updateErr);
      if (req.method === 'GET') return res.status(500).send('Database error');
      return res.status(500).json({ ok: false, error: 'database_error' });
    }

    if (req.method === 'GET') {
      return res.redirect(`${getAppBaseUrl()}/presencial?confirmed=1`);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[confirm_session_invite] error', e);
    if (req.method === 'GET') return res.status(500).send('Internal error');
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}