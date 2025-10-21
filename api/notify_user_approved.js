// simuped_web/api/notify_user_approved.js

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
    process.env.SIMUPED_LOGO_PATH,
    process.env.LOGO_ASSET_PATH,
    'assets/logo-simuped-Dtpd4WLf.avif',
    'logo-negative.png'
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = resolveAssetUrl(host, candidate);
    if (resolved) return resolved;
  }
  return null;
}

function buildApprovalEmail({ userName, dashboardUrl, logoUrl, heroUrl, supportEmail }) {
  return `
  <div style="background-color:#f5f7fb;padding:32px 0;margin:0;font-family:'Segoe UI',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background-color:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 50px rgba(15,23,42,0.12);">
      <tr>
        <td style="background:linear-gradient(135deg,#0A3D91,#1E6ACB);padding:32px;text-align:center;color:#ffffff;">
          ${logoUrl
            ? `<img src="${logoUrl}" alt="SimuPed" style="width:118px;max-width:100%;display:block;margin:0 auto 14px;" />
               <div style="font-size:18px;font-weight:600;letter-spacing:0.3px;">Simulación Pediátrica</div>`
            : '<div style="font-size:28px;font-weight:700;letter-spacing:0.4px;">SimuPed</div>'}
          <div style="margin-top:6px;font-size:15px;opacity:0.85;">Hospital Universitario Central de Asturias</div>
        </td>
      </tr>
      ${heroUrl
        ? `<tr>
             <td style="padding:0;background-color:#0A3D91;">
               <img src="${heroUrl}" alt="Equipo SimuPed" style="width:100%;display:block;object-fit:cover;max-height:240px;">
             </td>
           </tr>`
        : ''}
      <tr>
        <td style="padding:32px 36px;color:#1f2937;">
          <p style="margin:0;font-size:15px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Acceso concedido</p>
          <h1 style="margin:12px 0 20px;font-size:24px;color:#0f172a;">Tu cuenta ya está lista</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hola ${userName || ''}, tu registro en <strong style="color:#0A3D91;">SimuPed</strong> ha sido aprobado. Ya puedes acceder a la plataforma y comenzar a entrenar escenarios clínicos.</p>

          <div style="text-align:center;margin:24px 0 28px;">
            <a href="${dashboardUrl}" style="display:inline-block;background:#0A3D91;color:#ffffff;padding:14px 34px;border-radius:999px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 12px 30px rgba(10,61,145,0.35);">
              Entrar en SimuPed
            </a>
          </div>

          <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569;">Recuerda que puedes acceder con tus credenciales en cualquier momento. Si olvidaste tu contraseña, utiliza la opción de recuperación en la pantalla de inicio.</p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">¿Necesitas ayuda? Escríbenos a <a href="mailto:${supportEmail}" style="color:#0A3D91;text-decoration:none;">${supportEmail}</a>.</p>
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { email, nombre } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Falta el email del usuario" });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || 'notifications@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';

    if (!RESEND_API_KEY) {
      console.error('[notify_user_approved] Missing RESEND_API_KEY');
      return res.status(500).json({ error: 'missing_resend_api_key' });
    }

    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;

  const baseUrl = getAppBaseUrl();
  const assetBaseUrl = getAssetBaseUrl(baseUrl);
  const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);
  const heroUrl = resolveAssetUrl(assetBaseUrl || baseUrl, 'videohero1.gif');
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || process.env.PLATFORM_EMAIL || 'simuped@gmail.com';
    const dashboardUrl = `${baseUrl}/dashboard`;

    const payload = {
      from,
      to: email,
      subject: "✅ Tu cuenta en SimuPed ha sido aprobada",
      html: buildApprovalEmail({
        userName: nombre,
        dashboardUrl,
        logoUrl,
        heroUrl,
        supportEmail
      })
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Error enviando correo", details: data });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("[notify_user_approved] Error:", err);
    return res.status(500).json({ error: "Error enviando correo" });
  }
}