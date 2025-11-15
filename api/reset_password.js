import { createClient } from '@supabase/supabase-js';

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
    try {
      const host = new URL(candidate).hostname;
      if (!/vercel\.app$/i.test(host)) {
        return candidate.replace(/\/$/, '');
      }
    } catch {}
    return canonical;
  }
  if (process.env.NODE_ENV === 'production') return canonical;
  return 'http://localhost:5173';
}

function getAssetBaseUrl(appBaseUrl) {
  const candidates = [process.env.ASSET_BASE_URL, process.env.CDN_URL, process.env.VITE_ASSET_URL];
  for (const value of candidates) {
    if (value && typeof value === 'string') return value.replace(/\/$/, '');
  }
  return appBaseUrl;
}

function getLogoUrl(appBaseUrl, assetBaseUrl) {
  const candidates = [
    process.env.LOGO_URL,
    process.env.VITE_LOGO_URL,
    `${assetBaseUrl}/logo-negative.png`,
    `${appBaseUrl}/logo-negative.png`,
    `${assetBaseUrl}/logo-simuped-Dtpd4WLf.avif`,
    `${appBaseUrl}/logo-simuped-Dtpd4WLf.avif`
  ];
  for (const v of candidates) if (v && typeof v === 'string') return v;
  return null;
}

function buildResetEmail({ userEmail, resetLink, logoUrl, supportEmail }) {
  return `
  <div style="background-color:#f5f7fb;padding:20px 0;margin:0;font-family:'Segoe UI',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 15px 40px rgba(15,23,42,0.12);">
      <tr>
        <td bgcolor="#0A3D91" style="background-color:#0A3D91;background-image:linear-gradient(135deg,#0A3D91,#1E6ACB);padding:18px;text-align:center;color:#ffffff;">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="SimuPed" style="width:96px;max-width:100%;display:block;margin:0 auto 8px;" />
               <div style="font-size:16px;font-weight:600;letter-spacing:0.2px;">Simulación Pediátrica</div>`
            : '<div style="font-size:22px;font-weight:700;letter-spacing:0.3px;">SimuPed</div>'}
          <div style="margin-top:4px;font-size:13px;opacity:0.85;">Hospital Universitario Central de Asturias</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 36px;color:#1f2937;">
          <p style="margin:0;font-size:16px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Seguridad de la cuenta</p>
          <h1 style="margin:10px 0 14px;font-size:22px;color:#0f172a;">Restablece tu contraseña</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hemos recibido una solicitud para restablecer la contraseña de <strong>${userEmail || ''}</strong>.</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Para continuar, haz clic en el botón. Por motivos de seguridad, el enlace caduca a los pocos minutos.</p>

          <div style="text-align:center;margin:28px 0;">
            <a href="${resetLink}" style="display:inline-block;background:#0A3D91;color:#ffffff;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 10px 25px rgba(10,61,145,0.35);">Restablecer contraseña</a>
          </div>

          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;">Si el botón no funciona, copia y pega esta dirección en tu navegador:<br><span style="color:#0A3D91;word-break:break-all;">${resetLink}</span></p>
        </td>
      </tr>
      <tr>
        <td style="background-color:#f1f5f9;padding:20px 32px;text-align:center;color:#64748b;font-size:13px;">
          <p style="margin:0 0 6px;">Equipo SimuPed · UCI Pediátrica & UGC Farmacia HUCA</p>
          <p style="margin:6px 0;font-size:13px;color:#64748b;">¿Dudas? Escríbenos a <a href="mailto:${supportEmail || 'contacto@simuped.com'}" style="color:#0A3D91;text-decoration:none;">${supportEmail || 'contacto@simuped.com'}</a></p>
          <p style="margin:0;font-size:12px;opacity:0.75;">Este mensaje se envió automáticamente desde la plataforma SimuPed.</p>
        </td>
      </tr>
    </table>
  </div>
  `;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  const action = req.query.action || req.body?.action || 'send';
  if (action !== 'send') return res.status(400).json({ ok: false, error: 'invalid_action' });

  try {
    const email = (req.body?.email || '').toString().trim();
    if (!email) return res.status(200).json({ ok: true }); // respuesta genérica

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || 'notificaciones@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || 'contacto@simuped.com';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !RESEND_API_KEY) {
      // No está configurado el server para envío bonito
      return res.status(200).json({ ok: false, error: 'server_not_configured' });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {});
    const baseUrl = getAppBaseUrl();
    const assetBaseUrl = getAssetBaseUrl(baseUrl);
    const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);
    const redirectTo = `${baseUrl}/perfil?set_password=1`;

    const { data, error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo }
    });
    if (error) {
      // Responder OK genérico para no filtrar usuarios
      return res.status(200).json({ ok: true });
    }

    const resetLink = data?.properties?.action_link || data?.action_link || redirectTo;
    const html = buildResetEmail({ userEmail: email, resetLink, logoUrl, supportEmail });

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from, to: email, subject: 'Restablece tu contraseña', html })
    });
    // No surface detailed errors to the client
    return res.status(200).json({ ok: resp.ok });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
}
