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

function buildInviteEmail({ userName, email, loginUrl, logoUrl, supportEmail }) {
  const displayName = userName || 'colega';
  const callToActionUrl = loginUrl || 'https://www.simuped.com';
  const helperEmail = supportEmail || 'simuped@gmail.com';
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
      <tr>
        <td style="padding:32px 36px;color:#1f2937;">
          <p style="margin:0;font-size:15px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Invitación a SimuPed</p>
          <h1 style="margin:12px 0 20px;font-size:24px;color:#0f172a;">Bienvenido/a, ${displayName}</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Nuestro equipo te ha invitado a formar parte de <strong style="color:#0A3D91;">SimuPed</strong>, la plataforma de simulación pediátrica del HUCA. Tu correo de acceso será <strong>${email}</strong>.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Recibirás un segundo mensaje para crear tu contraseña. Una vez dentro, completa tu perfil para personalizar escenarios y notificaciones.</p>

          <div style="text-align:center;margin:24px 0 28px;">
            <a href="${callToActionUrl}" style="display:inline-block;background:#0A3D91;color:#ffffff;padding:14px 34px;border-radius:999px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 12px 30px rgba(10,61,145,0.35);">
              Entrar en SimuPed
            </a>
          </div>

          <p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#475569;">Si ya tienes cuenta, simplemente inicia sesión con este correo. Si no reconoces esta invitación, ignora el mensaje y contacta con nosotros.</p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">¿Dudas? Escríbenos a <a href="mailto:${helperEmail}" style="color:#0A3D91;text-decoration:none;">${helperEmail}</a>.</p>
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { email: rawEmail, nombre = '', apellidos = '' } = req.body || {};
    const email = (rawEmail || '').toString().trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Falta el correo electrónico' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: 'Faltan credenciales de servicio' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const existing = await admin.auth.admin.getUserByEmail(email);
    if (existing?.data?.user) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    }
    if (existing?.error && existing.error.message && existing.error.message !== 'User not found') {
      console.error('[admin_invite_user] Lookup error', existing.error);
      return res.status(500).json({ error: 'No se pudo verificar el correo' });
    }

    const metadata = {};
    if (nombre) metadata.nombre = nombre;
    if (apellidos) metadata.apellidos = apellidos;

    const invite = await admin.auth.admin.inviteUserByEmail(email, {
      data: metadata
    });

    if (invite.error) {
      console.error('[admin_invite_user] Invite error', invite.error);
      return res.status(invite.error.status || 500).json({ error: invite.error.message || 'No se pudo crear la invitación' });
    }

    const user = invite?.data?.user || null;
    const nowIso = new Date().toISOString();
    let profile = null;

    if (user?.id) {
      const payload = {
        id: user.id,
        email,
        nombre: nombre || null,
        apellidos: apellidos || null,
        approved: false,
        created_at: user.created_at || nowIso,
        updated_at: nowIso
      };

      const upsert = await admin
        .from('profiles')
        .upsert(payload, { onConflict: 'id' })
        .select();

      if (upsert.error) {
        console.warn('[admin_invite_user] Profile upsert warning', upsert.error);
      } else {
        const rows = Array.isArray(upsert.data) ? upsert.data : [];
        profile = rows[0] || null;
      }
    }

    const baseUrl = getAppBaseUrl();
    const assetBaseUrl = getAssetBaseUrl(baseUrl);
    const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || process.env.PLATFORM_EMAIL || 'simuped@gmail.com';
    const loginUrl = `${baseUrl}`;

    let emailSent = false;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM || 'notificaciones@simuped.com';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'SimuPed';
    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;

    if (RESEND_API_KEY) {
      try {
        const html = buildInviteEmail({
          userName: [nombre, apellidos].filter(Boolean).join(' ').trim(),
          email,
          loginUrl,
          logoUrl,
          supportEmail
        });

        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from,
            to: email,
            subject: 'Invitación a SimuPed',
            html
          })
        });

        if (resp.ok) {
          emailSent = true;
        } else {
          const errPayload = await resp.json().catch(() => null);
          console.warn('[admin_invite_user] Resend error payload', errPayload);
        }
      } catch (mailErr) {
        console.error('[admin_invite_user] Resend exception', mailErr);
      }
    } else {
      console.warn('[admin_invite_user] RESEND_API_KEY no configurada, se omite correo personalizado');
    }

    return res.status(200).json({ ok: true, user, profile, emailSent });
  } catch (err) {
    console.error('[admin_invite_user] Error inesperado', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
