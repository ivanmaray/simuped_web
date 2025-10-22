import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

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
    `${assetBaseUrl}/logo-negative.png`,
    `${appBaseUrl}/logo-negative.png`,
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

export default async function handler(req, res) {
  const action = req.query.action || req.body?.action;

  if (!action) {
    return res.status(400).json({ ok: false, error: 'missing_action' });
  }

  switch (action) {
    case 'new_user':
      return await handleNewUserEmail(req, res);
    case 'session_registration':
      return await handleSessionRegistration(req, res);
    case 'user_approved':
      return await handleUserApproved(req, res);
    case 'session_reminder':
      return await handleSessionReminder(req, res);
    default:
      return res.status(400).json({ ok: false, error: 'invalid_action' });
  }
}

async function handleNewUserEmail(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    console.log("[new-user-email] ENV check", {
      hasKey: !!process.env.RESEND_API_KEY,
      to: process.env.ADMIN_NOTIFY_EMAIL,
    });
    const {
      nombre = '', apellidos = '', email = '', dni = '', rol = '', unidad = ''
    } = req.body || {};

    const resend = new Resend(process.env.RESEND_API_KEY);
    const to = process.env.ADMIN_NOTIFY_EMAIL;

    if (!to) return res.status(400).json({ ok: false, error: 'Falta ADMIN_NOTIFY_EMAIL' });

    const subject = `Nuevo registro en SimuPed: ${nombre} ${apellidos}`;
    const html = `
      <h2>Nuevo registro pendiente de aprobación</h2>
      <ul>
        <li><b>Nombre:</b> ${nombre} ${apellidos}</li>
        <li><b>Email:</b> ${email}</li>
        <li><b>DNI:</b> ${dni}</li>
        <li><b>Rol:</b> ${rol}</li>
        <li><b>Unidad:</b> ${unidad}</li>
      </ul>
      <p>Accede al panel de Supabase para aprobar al usuario.</p>
    `;

    await resend.emails.send({
      from: 'SimuPed <notificaciones@simuped.com>',
      to,
      subject,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[new-user-email] error', err);
    return res.status(500).json({ ok: false, error: 'Email send failed' });
  }
}

async function handleSessionRegistration(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { session_id, user_id, user_email, user_name } = req.body || {};
    if (!session_id || !user_id || !user_email) {
      return res.status(400).json({ ok: false, error: 'missing_parameters' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {});

    // Get session details
    const { data: session, error: sessionErr } = await sb
      .from('scheduled_sessions')
      .select('id, title, scheduled_at, location, instructor_id')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      return res.status(404).json({ ok: false, error: 'session_not_found' });
    }

    // Get instructor details
    const { data: instructor, error: instructorErr } = await sb
      .from('profiles')
      .select('id, nombre, apellidos, email')
      .eq('id', session.instructor_id)
      .single();

    const instructorName = instructor ? `${instructor.nombre} ${instructor.apellidos}`.trim() : 'Equipo SimuPed';
    const instructorEmail = instructor?.email || process.env.ADMIN_NOTIFY_EMAIL || 'contacto@simuped.com';

    const { date: sessionDate, time: sessionTime } = formatSessionDateParts(session.scheduled_at);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const baseUrl = getAppBaseUrl();
    const assetBaseUrl = getAssetBaseUrl(baseUrl);
    const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);

    const html = `
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
              <h1 style="margin:10px 0 14px;font-size:22px;color:#0f172a;">¡Registro confirmado!</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hola ${user_name || 'Participante'},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Tu registro para la sesión <strong style="color:#0A3D91;">${session.title}</strong> ha sido confirmado exitosamente.</p>

              <div style="margin:20px 0;padding:20px 24px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
                <p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📅 Fecha y hora:</strong><br>${sessionDate} a las ${sessionTime}</p>
                <p style="margin:0;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📍 Lugar:</strong><br>${session.location || 'Por confirmar'}</p>
              </div>

              <p style="margin:16px 0 12px;font-size:14px;line-height:1.6;color:#475569;">Te esperamos puntualmente. Si tienes alguna duda, no dudes en contactar con el instructor.</p>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">Instructor: <strong>${instructorName}</strong> - <a href="mailto:${instructorEmail}" style="color:#0A3D91;text-decoration:none;">${instructorEmail}</a></p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f5f9;padding:20px 32px;text-align:center;color:#64748b;font-size:13px;">
              <p style="margin:0 0 6px;">Equipo SimuPed · UCI Pediátrica & UGC Farmacia HUCA</p>
              <p style="margin:6px 0;font-size:13px;color:#64748b;">¿Dudas? Escríbenos a <a href="mailto:contacto@simuped.com" style="color:#0A3D91;text-decoration:none;">contacto@simuped.com</a></p>
              <p style="margin:0;font-size:12px;opacity:0.75;">Este mensaje se envió automáticamente desde la plataforma SimuPed.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    await resend.emails.send({
      from: 'SimuPed <notificaciones@simuped.com>',
      to: user_email,
      subject: `Registro confirmado: ${session.title}`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify_session_registration] error', err);
    return res.status(500).json({ ok: false, error: 'Email send failed' });
  }
}

async function handleUserApproved(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { user_email, user_name } = req.body || {};
    if (!user_email || !user_name) {
      return res.status(400).json({ ok: false, error: 'missing_parameters' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const baseUrl = getAppBaseUrl();
    const assetBaseUrl = getAssetBaseUrl(baseUrl);
    const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);

    const html = `
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
              <h1 style="margin:10px 0 14px;font-size:22px;color:#0f172a;">¡Bienvenido a SimuPed!</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hola ${user_name},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Tu cuenta ha sido aprobada y ya puedes acceder a la plataforma SimuPed.</p>

              <div style="text-align:center;margin:28px 0;">
                <a href="${baseUrl}/auth" style="display:inline-block;background:#0A3D91;color:#ffffff;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 10px 25px rgba(10,61,145,0.35);">Acceder a SimuPed</a>
              </div>

              <p style="margin:16px 0 12px;font-size:14px;line-height:1.6;color:#475569;">Ya puedes explorar los escenarios disponibles, inscribirte en sesiones y comenzar tu formación en simulación pediátrica.</p>
              
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f5f9;padding:20px 32px;text-align:center;color:#64748b;font-size:13px;">
              <p style="margin:0 0 6px;">Equipo SimuPed · UCI Pediátrica & UGC Farmacia HUCA</p>
              <p style="margin:6px 0;font-size:13px;color:#64748b;">¿Dudas? Escríbenos a <a href="mailto:contacto@simuped.com" style="color:#0A3D91;text-decoration:none;">contacto@simuped.com</a></p>
              <p style="margin:0;font-size:12px;opacity:0.75;">Este mensaje se envió automáticamente desde la plataforma SimuPed.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    await resend.emails.send({
      from: 'SimuPed <notificaciones@simuped.com>',
      to: user_email,
      subject: 'Cuenta aprobada - Bienvenido a SimuPed',
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[notify_user_approved] error', err);
    return res.status(500).json({ ok: false, error: 'Email send failed' });
  }
}

async function handleSessionReminder(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  try {
    const { session_id, user_id, user_email, user_name } = req.body || {};
    if (!session_id || !user_id || !user_email) {
      return res.status(400).json({ ok: false, error: 'missing_parameters' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {});

    // Get session details
    const { data: session, error: sessionErr } = await sb
      .from('scheduled_sessions')
      .select('id, title, scheduled_at, location, instructor_id')
      .eq('id', session_id)
      .single();

    if (sessionErr || !session) {
      return res.status(404).json({ ok: false, error: 'session_not_found' });
    }

    const { date: sessionDate, time: sessionTime } = formatSessionDateParts(session.scheduled_at);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const baseUrl = getAppBaseUrl();
    const assetBaseUrl = getAssetBaseUrl(baseUrl);
    const logoUrl = getLogoUrl(baseUrl, assetBaseUrl);

    const html = `
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
              <h1 style="margin:10px 0 14px;font-size:22px;color:#0f172a;">Recordatorio de sesión</h1>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hola ${user_name || 'Participante'},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Te recordamos que tienes una sesión programada próximamente:</p>

              <div style="margin:20px 0;padding:20px 24px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
                <p style="margin:0 0 12px;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📅 Fecha y hora:</strong><br>${sessionDate} a las ${sessionTime}</p>
                <p style="margin:0;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📍 Lugar:</strong><br>${session.location || 'Por confirmar'}</p>
              </div>

              <p style="margin:16px 0 12px;font-size:14px;line-height:1.6;color:#475569;">Te esperamos puntualmente. Prepara todo el material necesario y llega con tiempo suficiente.</p>
              
            </td>
          </tr>
          <tr>
            <td style="background-color:#f1f5f9;padding:20px 32px;text-align:center;color:#64748b;font-size:13px;">
              <p style="margin:0 0 6px;">Equipo SimuPed · UCI Pediátrica & UGC Farmacia HUCA</p>
              <p style="margin:6px 0;font-size:13px;color:#64748b;">¿Dudas? Escríbenos a <a href="mailto:contacto@simuped.com" style="color:#0A3D91;text-decoration:none;">contacto@simuped.com</a></p>
              <p style="margin:0;font-size:12px;opacity:0.75;">Este mensaje se envió automáticamente desde la plataforma SimuPed.</p>
            </td>
          </tr>
        </table>
      </div>
    `;

    await resend.emails.send({
      from: 'SimuPed <notificaciones@simuped.com>',
      to: user_email,
      subject: `Recordatorio: ${session.title}`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[send_session_reminder] error', err);
    return res.status(500).json({ ok: false, error: 'Email send failed' });
  }
}