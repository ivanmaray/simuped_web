import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function signPayload(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
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

function buildInviteEmail({ userName, sessionName, sessionDate, sessionLocation, inviteLink, logoUrl }) {
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
        </td>
      </tr>
      <tr>
        <td style="background-color:#f1f5f9;padding:20px 32px;text-align:center;color:#64748b;font-size:13px;">
          <p style="margin:0 0 6px;">Equipo SimuPed · UCI Pediátrica & UGC Farmacia HUCA</p>
          <p style="margin:0;font-size:12px;opacity:0.75;">Este mensaje se envió de forma automática desde la plataforma SimuPed.</p>
        </td>
      </tr>
    </table>
  </div>
  `;
}

function getAppBaseUrl() {
  const candidates = [
    process.env.APP_BASE_URL,
    process.env.SITE_URL,
    process.env.VITE_SITE_URL,
    process.env.VITE_APP_URL
  ];
  for (const value of candidates) {
    if (value && typeof value === 'string') {
      return value.replace(/\/$/, '');
    }
  }
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && typeof vercelUrl === 'string') {
    const sanitized = vercelUrl.replace(/\/$/, '');
    if (sanitized.startsWith('http')) return sanitized;
    return `https://${sanitized}`;
  }
  return process.env.NODE_ENV === 'production' ? 'https://simuped.vercel.app' : 'http://localhost:5173';
}

function getAssetBaseUrl(appBaseUrl) {
  const candidates = [
    process.env.ASSET_BASE_URL,
    process.env.PUBLIC_ASSET_HOST,
    process.env.NEXT_PUBLIC_ASSET_BASE_URL,
    appBaseUrl
  ];
  for (const value of candidates) {
    if (value && typeof value === 'string') {
      return value.replace(/\/$/, '');
    }
  }
  return appBaseUrl ? appBaseUrl.replace(/\/$/, '') : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { session_id, user_id, session_name, session_date, session_location } = req.body || {};
  if (!session_id || !user_id) return res.status(400).json({ ok: false, error: 'Missing parameters' });

  const INVITE_SECRET =
    process.env.INVITE_TOKEN_SECRET ||
    process.env.INVITE_FALLBACK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!INVITE_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[resend_session_invite] Missing configuration', {
      hasInviteSecret: Boolean(INVITE_SECRET),
      hasUrl: Boolean(SUPABASE_URL),
      hasServiceKey: Boolean(SUPABASE_SERVICE_KEY)
    });
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
    const logoUrl = assetBaseUrl ? `${assetBaseUrl}/logo-negative.png` : null;
    const inviteLink = `${baseUrl}/confirm-invite?token=${encodeURIComponent(token)}`;

    // Send email directly via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || 'notifications@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;
    const html = `
      ${buildInviteEmail({
        userName: [profile.nombre, profile.apellidos].filter(Boolean).join(' '),
        sessionName: session_name,
        sessionDate: session_date,
        sessionLocation: session_location,
        inviteLink,
        logoUrl
      })}
    `;
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
