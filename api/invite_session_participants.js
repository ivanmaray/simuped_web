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

function resolveAssetUrl(baseUrl, assetPath) {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  if (!baseUrl) return normalized;
  return `${baseUrl}${normalized}`;
}

function getLogoUrl(baseUrl, assetBaseUrl) {
  const host = assetBaseUrl || baseUrl || '';
  const candidates = [
    process.env.SIMUPED_EMAIL_LOGO_PATH,
    process.env.SIMUPED_LOGO_PATH,
    process.env.LOGO_ASSET_PATH,
    'logo-negative.png',
    'logo-simuped-Dtpd4WLf.avif',
    'logo-simuped.avif',
    'logo-simuped.png'
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = resolveAssetUrl(host, candidate);
    if (resolved) return resolved;
  }
  return null;
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

    const INVITE_SECRET =
      process.env.INVITE_TOKEN_SECRET ||
      process.env.INVITE_FALLBACK_SECRET ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY;
    if (!INVITE_SECRET) {
      console.error('[invite_session_participants] Missing invite secret configuration');
      return res.status(500).json({ ok: false, error: 'missing_invite_secret' });
    }

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
          const MAIL_FROM = process.env.MAIL_FROM || 'notifications@simuped.com';
          const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
          const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;
          const baseUrl = getAppBaseUrl();
          const assetBaseUrl = getAssetBaseUrl(baseUrl);
          const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);
          const supportEmail = process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || 'contacto@simuped.com';
          const inviteLink = `${baseUrl}/confirm-invite?token=${encodeURIComponent(token)}`;

          const html = buildInviteEmail({
            userName,
            sessionName: req.body.session_name,
            sessionDate: req.body.session_date,
            sessionLocation: req.body.session_location,
            inviteLink,
            logoUrl,
            supportEmail
          });

          if (!RESEND_API_KEY) {
            console.error('[invite_session_participants] MISSING RESEND_API_KEY');
            results.push({ user_id: uid, ok: false, error: 'missing_resend_api_key' });
            continue;
          }
          if (!RESEND_API_KEY) {
            console.error('[invite_session_participants] Missing RESEND_API_KEY');
            results.push({ user_id: uid, ok: false, error: 'missing_resend_api_key' });
            continue;
          }

          const resp = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({ from, to: userEmail, subject: `Invitación: ${req.body.session_name || 'Sesión SimuPed'}`, html })
          });
          const respText = await resp.text().catch(() => null);
          let respJson = null;
          try { respJson = respText ? JSON.parse(respText) : null; } catch (e) { respJson = null; }
          if (!resp.ok) {
            console.warn('[invite_session_participants] resend send failed', resp.status, respText);
            results.push({ user_id: uid, ok: false, error: 'email_send_failed', detail: respText, status: resp.status, resend: respJson });
            continue;
          }
          console.log('[invite_session_participants] resend send success', resp.status, respJson);
          results.push({ user_id: uid, ok: true, resend: respJson || respText });
          continue;
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
