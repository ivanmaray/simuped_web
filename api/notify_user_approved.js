// simuped_web/api/notify_user_approved.js
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
    const MAIL_FROM = process.env.MAIL_FROM;
    const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME;

    const from = MAIL_FROM_NAME ? `${MAIL_FROM_NAME} <${MAIL_FROM}>` : MAIL_FROM;

    const payload = {
      from,
      to: email,
      subject: "✅ Tu cuenta en SimuPed ha sido aprobada",
      html: `
        <h2>¡Hola ${nombre || ""}!</h2>
        <p>Nos alegra informarte de que tu cuenta en <strong>SimuPed</strong> ha sido aprobada por un administrador.</p>
        <p>Ya puedes acceder a la plataforma y comenzar a entrenar escenarios clínicos.</p>
        <br/>
        <a href="https://www.simuped.com/dashboard"
           style="background:#1a69b8;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">
           Ir al panel
        </a>
        <br/><br/>
        <p>Gracias por formar parte de SimuPed.</p>
      `,
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