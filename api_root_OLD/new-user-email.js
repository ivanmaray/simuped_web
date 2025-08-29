// api/new-user-email.js
import { Resend } from 'resend';

export default async function handler(req, res) {
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
      from: 'SimuPed <notificaciones@simuped.com>', // en Resend puedes usar un dominio verificado o `onboarding@resend.dev` para pruebas
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