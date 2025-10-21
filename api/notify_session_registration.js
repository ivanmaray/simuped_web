// simuped_web/api/notify_session_registration.js

function formatSessionDateParts(value) {
  if (!value) return { date: '', time: '' };
  try {
    const date = new Date(value);
    return {
      date: date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  } catch {
    return { date: value, time: '' };
  }
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

function buildSessionRegistrationEmail({
  userName,
  sessionName,
  sessionDate,
  sessionLocation,
  ctaLink,
  ctaLabel,
  logoUrl,
  heroUrl,
  supportEmail
}) {
  const { date, time } = formatSessionDateParts(sessionDate);
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
          <p style="margin:0;font-size:15px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Registro confirmado</p>
          <h1 style="margin:12px 0 20px;font-size:24px;color:#0f172a;">¡Te esperamos en SimuPed!</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hola ${userName || ''}, gracias por apuntarte a la sesión <strong style="color:#0A3D91;">${sessionName || 'Sesión SimuPed'}</strong>. Aquí tienes un resumen:</p>

          <div style="margin:20px 0;padding:22px 24px;border:1px solid #e2e8f0;border-radius:16px;background:#f8fafc;">
            <p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📅 Fecha:</strong><br>${date || 'Por confirmar'}</p>
            <p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">⏰ Hora:</strong><br>${time || 'Por confirmar'}</p>
            <p style="margin:0;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📍 Lugar:</strong><br>${sessionLocation || 'Pendiente de determinar'}</p>
          </div>

          ${ctaLink
            ? `<div style="text-align:center;margin:30px 0 24px;">
                 <a href="${ctaLink}" style="display:inline-block;background:#0A3D91;color:#ffffff;padding:14px 34px;border-radius:999px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 12px 30px rgba(10,61,145,0.35);">
                   ${ctaLabel || 'Abrir SimuPed'}
                 </a>
               </div>`
            : ''}

          <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569;">Recomendamos llegar con 10 minutos de antelación para preparar el material. Si necesitas modificar tu asistencia, puedes gestionarlo desde tu panel.</p>
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
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
  const { userEmail, userName, sessionName, sessionDate, sessionLocation, sessionCode, inviteLink } = req.body;

    if (!userEmail || !sessionName || !sessionDate || !sessionLocation) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const MAIL_FROM = process.env.MAIL_FROM || 'notifications@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;

    if (!RESEND_API_KEY) {
      console.error('[notify_session_registration] MISSING RESEND_API_KEY');
      return res.status(500).json({ error: 'missing_resend_api_key' });
    }

    // Email configuration
  const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;

  // Platform admin email (send notification about new registration)
  const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL || "contacto@simuped.com";

  const baseUrl = getAppBaseUrl();
  const assetBaseUrl = getAssetBaseUrl(baseUrl);
  const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);
  const heroUrl = resolveAssetUrl(assetBaseUrl || baseUrl, 'videohero2.gif');
    const defaultCtaLink = `${baseUrl}/dashboard`;
    const ctaLink = inviteLink || defaultCtaLink;
    const ctaLabel = inviteLink ? 'Confirmar asistencia' : 'Ir a mi panel';
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || 'contacto@simuped.com';

    // Email to the user who registered
    const userPayload = {
      from,
      to: userEmail,
      subject: "✅ Registro confirmado · Sesión SimuPed",
      html: buildSessionRegistrationEmail({
        userName,
        sessionName,
        sessionDate,
        sessionLocation,
        ctaLink,
        ctaLabel,
        logoUrl,
        heroUrl,
        supportEmail
      }),
    };

    // Email to the platform admin
    const adminPayload = {
      from,
      to: PLATFORM_EMAIL,
      subject: `📋 Nueva inscripción en sesión de SimuPed - ${userName || userEmail}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h3 style="color: #e74c3c;">Nueva inscripción en sesión</h3>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #2c3e50; margin: 0 0 10px 0;">${sessionName}</h4>
            <p style="margin: 5px 0;"><strong>👤 Usuario:</strong> ${userName || "Sin nombre"} (${userEmail})</p>
            <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${new Date(sessionDate).toLocaleString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p style="margin: 5px 0;"><strong>📍 Ubicación:</strong> ${sessionLocation}</p>
            <p style="margin: 5px 0;"><strong>🔗 Código de sesión:</strong> ${sessionCode || "N/A"}</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="https://www.simuped.com/sesiones-programadas"
               style="background:#3498db;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
               Ver sesiones programadas
            </a>
          </div>

          <p style="color: #6c757d; font-size: 14px;">
            Esta es una notificación automática del sistema.
          </p>
        </div>
      `,
    };

    // Send both emails
    const [userResponse, adminResponse] = await Promise.all([
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(userPayload),
      }),
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify(adminPayload),
      })
    ]);

    const [userText, adminText] = await Promise.all([
      userResponse.text().catch(() => null),
      adminResponse.text().catch(() => null),
    ]);
    let userData = null, adminData = null;
    try { userData = userText ? JSON.parse(userText) : null; } catch { userData = null; }
    try { adminData = adminText ? JSON.parse(adminText) : null; } catch { adminData = null; }

    // Check if both emails sent successfully
    const userOk = userResponse.ok;
    const adminOk = adminResponse.ok;

    if (!userOk || !adminOk) {
      const errors = [];
      if (!userOk) errors.push({ type: "user", status: userResponse.status, raw: userText, details: userData });
      if (!adminOk) errors.push({ type: "admin", status: adminResponse.status, raw: adminText, details: adminData });

      console.warn('[notify_session_registration] resend errors', errors);

      return res.status(500).json({
        error: "Error enviando uno o más correos",
        details: errors
      });
    }

    console.log('[notify_session_registration] emails sent', { user: userData, admin: adminData });

    return res.status(200).json({ ok: true, data: { userData, adminData } });
  } catch (err) {
    console.error("[notify_session_registration] Error:", err);
    return res.status(500).json({ error: "Error enviando correos" });
  }
}
