// simuped_web/api/notify_user_approved.js
import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const { email, nombre } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Falta el email del usuario" });
    }

    // Configuración del transporte (usa tus credenciales reales)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,      // ej. smtp.sendgrid.net
      port: process.env.SMTP_PORT || 587,
      secure: false,                    // true si usas 465
      auth: {
        user: process.env.SMTP_USER,    // ej. notificaciones@simuped.com
        pass: process.env.SMTP_PASS,
      },
    });

    // Contenido del correo
    const mailOptions = {
      from: '"SimuPed" <notificaciones@simuped.com>',
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

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ ok: true, message: "Correo enviado al usuario aprobado" });
  } catch (err) {
    console.error("[notify_user_approved] Error:", err);
    return res.status(500).json({ error: "Error enviando correo" });
  }
}