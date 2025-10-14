// api/send_session_reminder.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { email, nombre, sessionTitle, sessionDate, minutesBefore, reminderType } = req.body;

    if (!email || !sessionTitle || !sessionDate) {
      return res.status(400).json({ error: "Faltan parámetros requeridos" });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const MAIL_FROM = process.env.MAIL_FROM;
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;

    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;

    let subject, html;

    const formatDate = new Date(sessionDate).toLocaleString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    switch (reminderType) {
      case 'session_reminder':
        subject = `⏰ Recordatorio: Sesión de SimuPed en ${minutesBefore} minutos`;
        html = `
          <h2>¡Hola ${nombre || ""}!</h2>
          <p>Te recordamos que tu sesión programada está próxima a comenzar:</p>
          <div style="background:#f3f4f6;padding:20px;margin:20px 0;border-radius:8px;">
            <h3>${sessionTitle}</h3>
            <p><strong>Fecha y hora:</strong> ${formatDate}</p>
            <p><strong>Recordatorio:</strong> ${minutesBefore} minutos antes</p>
          </div>
          <p>Prepara todo lo necesario y accede a la plataforma cuando estés listo.</p>
          <br/>
          <a href="https://www.simuped.com/dashboard"
             style="background:#1a69b8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
             Ir al panel
          </a>
          <br/><br/>
          <p>¡Éxito en tu simulación!</p>
        `;
        break;

      case 'session_starting':
        subject = `🎯 ¡Tu sesión de SimuPed comienza ahora!`;
        html = `
          <h2>¡Hola ${nombre || ""}!</h2>
          <p>Tu sesión programada está a punto de comenzar:</p>
          <div style="background:#10b981;color:#fff;padding:20px;margin:20px 0;border-radius:8px;">
            <h3>${sessionTitle}</h3>
            <p><strong>Fecha y hora:</strong> ${formatDate}</p>
            <p><strong>Estado:</strong> Comenzando en breve</p>
          </div>
          <p>Si participas en una sesión presencial, llega puntualmente al lugar indicado.</p>
          <p>Si es una sesión online, accede ya a la plataforma.</p>
          <br/>
          <a href="https://www.simuped.com/dashboard"
             style="background:#059669;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
             Acceder ahora
          </a>
          <br/><br/>
          <p>¡Mucha suerte y éxito!</p>
        `;
        break;

      case 'session_cancelled':
        subject = `❌ Sesión cancelada: ${sessionTitle}`;
        html = `
          <h2>¡Hola ${nombre || ""}!</h2>
          <p>Lamentamos informarte que la siguiente sesión ha sido cancelada:</p>
          <div style="background:#ef4444;color:#fff;padding:20px;margin:20px 0;border-radius:8px;">
            <h3>${sessionTitle}</h3>
            <p><strong>Fecha programada:</strong> ${formatDate}</p>
            <p><strong>Estado:</strong> Cancelada</p>
          </div>
          <p>Pronto anunciaremos nuevas sesiones. Mantente atento al panel.</p>
          <br/>
          <a href="https://www.simuped.com/dashboard"
             style="background:#1a69b8;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
             Ver otras sesiones
          </a>
          <br/><br/>
          <p>Gracias por tu comprensión.</p>
        `;
        break;

      case 'activity_reminder':
        const days = minutesBefore; // reusing parameter for days
        subject = `📚 Recordatorio: ¡Es hora de practicar en SimuPed!`;
        html = `
          <h2>¡Hola ${nombre || ""}!</h2>
          <p>Hace ${days} días que no realizas simulaciones clínicas.</p>
          <p>Mantener tus habilidades actualizadas es clave para la práctica médica de calidad.</p>
          <div style="background:#f59e0b;color:#fff;padding:20px;margin:20px 0;border-radius:8px;">
            <h3>¡Es momento de volver a SimuPed!</h3>
            <p>Escenarios interactivos te esperan</p>
          </div>
          <p>¿Listo para continuar tu formación?</p>
          <br/>
          <a href="https://www.simuped.com/dashboard"
             style="background:#d97706;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
             Practicar ahora
          </a>
          <br/><br/>
          <p>¡Cada simulación te hace mejor profesional!</p>
        `;
        break;

      case 'badge_earned':
        subject = `🏆 ¡Nuevo logro desbloqueado en SimuPed!`;
        html = `
          <h2>¡Felicitaciones ${nombre || ""}!</h2>
          <p>Has desbloqueado un nuevo badge en SimuPed:</p>
          <div style="background:#8b5cf6;color:#fff;padding:20px;margin:20px 0;border-radius:8px;text-align:center;">
            <h3>${sessionTitle}</h3>
            <p>${sessionDate}</p>
          </div>
          <p>¡Sigue practicando para continuar avanzando!</p>
          <br/>
          <a href="https://www.simuped.com/perfil"
             style="background:#7c3aed;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
             Ver mis logros
          </a>
          <br/><br/>
          <p>¡Excelente trabajo!</p>
        `;
        break;

      case 'feedback_available':
        subject = `💬 Nuevo feedback disponible en SimuPed`;
        html = `
          <h2>¡Hola ${nombre || ""}!</h2>
          <p>El feedback de tu sesión está listo para revisar:</p>
          <div style="background:#3b82f6;color:#fff;padding:20px;margin:20px 0;border-radius:8px;">
            <h3>Feedback disponible</h3>
            <p><strong>Sesión:</strong> ${sessionTitle}</p>
            <p><strong>Fecha:</strong> ${formatDate}</p>
          </div>
          <p>Revisa las observaciones y recomendaciones para mejorar tu práctica.</p>
          <br/>
          <a href="https://www.simuped.com/evaluacion"
             style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
             Ver feedback
          </a>
          <br/><br/>
          <p>¡Gracias por tu dedicación!</p>
        `;
        break;

      default:
        return res.status(400).json({ error: "Tipo de recordatorio desconocido" });
    }

    const payload = {
      from,
      to: email,
      subject,
      html,
    };

    console.log("[send_session_reminder] Enviando email:", { to: email, subject, from });

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
      console.error("[send_session_reminder] Error from Resend:", data);
      return res.status(response.status).json({ error: "Error enviando correo", details: data });
    }

    console.log("[send_session_reminder] Email enviado correctamente:", data.id);

    return res.status(200).json({ ok: true, data, id: data.id });
  } catch (err) {
    console.error("[send_session_reminder] Error:", err);
    return res.status(500).json({ error: "Error enviando correo de recordatorio" });
  }
}
