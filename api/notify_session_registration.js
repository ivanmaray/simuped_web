// simuped_web/api/notify_session_registration.js
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
  const MAIL_FROM = process.env.MAIL_FROM || 'onboarding@resend.dev';
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;

    if (!RESEND_API_KEY) {
      console.error('[notify_session_registration] MISSING RESEND_API_KEY');
      return res.status(500).json({ error: 'missing_resend_api_key' });
    }

    // Email configuration
    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;

    // Platform admin email (send notification about new registration)
    const PLATFORM_EMAIL = process.env.PLATFORM_EMAIL || "simuped@gmail.com"; // Change to your actual platform email

    // Email to the user who registered
    const userPayload = {
      from,
      to: userEmail,
      subject: "✅ Bienvenido/a - Te has registrado en una sesión de SimuPed",
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #1a69b8;">¡Hola ${userName || ""}!</h2>

          <p>Gracias por registrarte en la sesión de <strong>SimuPed</strong>:</p>

          <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1a69b8; margin: 0 0 10px 0;">${sessionName}</h3>
            <p style="margin: 5px 0;"><strong>📅 Fecha:</strong> ${new Date(sessionDate).toLocaleString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p style="margin: 5px 0;"><strong>⏰ Hora:</strong> ${new Date(sessionDate).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
            <p style="margin: 5px 0;"><strong>📍 Lugar:</strong> ${sessionLocation}</p>
            ${sessionCode ? `<p style="margin: 5px 0;"><strong>🔗 Código de sesión:</strong> ${sessionCode}</p>` : ''}
          </div>

          <p style="color: #6c757d; font-style: italic;">
            Recuerda llegar con 10 minutos de anticipación para el setup de la sesión.
          </p>

          <div style="margin: 30px 0;">
        ${inviteLink ? `
        <a href="${inviteLink}"
          style="background:#1a69b8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Confirmar asistencia
        </a>
        ` : `
        <a href="https://www.simuped.com/dashboard"
          style="background:#1a69b8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Ir a mi panel
        </a>
        `}
          </div>

          <p style="color: #6c757d; font-size: 14px;">
            Si tienes preguntas, puedes contactar con el equipo de SimuPed.<br>
            ¡Te esperamos en la sesión!
          </p>
        </div>
      `,
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
