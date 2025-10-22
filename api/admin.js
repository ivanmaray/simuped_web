import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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

export default async function handler(req, res) {
  const action = req.query.action || req.body?.action;

  if (!action) {
    return res.status(400).json({ ok: false, error: 'missing_action' });
  }

  switch (action) {
    case 'delete_user':
      return await handleDeleteUser(req, res);
    case 'invite_user':
      return await handleInviteUser(req, res);
    case 'seed_profile':
      return await handleSeedProfile(req, res);
    default:
      return res.status(400).json({ ok: false, error: 'invalid_action' });
  }
}

async function handleDeleteUser(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { id, email } = req.body || {};
    if (!id) {
      return res.status(400).json({ error: 'Falta el identificador del usuario' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('[admin_delete_user] Missing service credentials');
      return res.status(500).json({ error: 'Faltan credenciales de servicio' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const deleteResult = await admin.auth.admin.deleteUser(id);
    if (deleteResult.error && deleteResult.error.message !== 'User not found') {
      console.error('[admin_delete_user] delete error', deleteResult.error);
      return res.status(deleteResult.error.status || 500).json({ error: deleteResult.error.message || 'No se pudo borrar el usuario' });
    }

    try {
      await admin.from('profiles').delete().eq('id', id);
    } catch (profileErr) {
      console.warn('[admin_delete_user] profile delete warning', profileErr);
    }

    try {
      await admin.from('scheduled_session_invites').delete().eq('invited_email', email || null);
    } catch (inviteErr) {
      console.warn('[admin_delete_user] invite cleanup warning', inviteErr);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[admin_delete_user] unexpected error', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function handleInviteUser(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email, nombre, apellidos, rol, unidad } = req.body || {};
    if (!email || !nombre || !apellidos) {
      return res.status(400).json({ ok: false, error: 'missing_required_fields' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_API_KEY) {
      console.error('[admin_invite_user] Missing configuration');
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Check if user already exists
    const { data: existingUser } = await admin.auth.admin.listUsers();
    const userExists = existingUser.users.some(u => u.email === email);

    if (userExists) {
      return res.status(400).json({ ok: false, error: 'user_already_exists' });
    }

    // Create user account
    const { data: userData, error: createError } = await admin.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-12) + 'Aa1!',
      email_confirm: true,
      user_metadata: {
        nombre,
        apellidos,
        rol: rol || '',
        unidad: unidad || ''
      }
    });

    if (createError) {
      console.error('[admin_invite_user] create user error', createError);
      return res.status(createError.status || 500).json({ ok: false, error: createError.message || 'failed_to_create_user' });
    }

    // Create profile
    const { error: profileError } = await admin
      .from('profiles')
      .insert([{
        id: userData.user.id,
        nombre,
        apellidos,
        email,
        rol: rol || null,
        unidad: unidad || null,
        approved: true
      }]);

    if (profileError) {
      console.error('[admin_invite_user] profile creation error', profileError);
      // Try to delete the created user if profile creation fails
      try {
        await admin.auth.admin.deleteUser(userData.user.id);
      } catch (deleteErr) {
        console.error('[admin_invite_user] cleanup delete error', deleteErr);
      }
      return res.status(500).json({ ok: false, error: 'failed_to_create_profile', details: profileError.message });
    }

    // Send welcome email
    const resend = new Resend(RESEND_API_KEY);
    const baseUrl = getAppBaseUrl();
    const assetBaseUrl = getAssetBaseUrl(baseUrl);
    const logoUrl = resolveAssetUrl(assetBaseUrl, '/logo-simuped-Dtpd4WLf.avif');

    const html = `
      <div style="background-color:#f5f7fb;padding:20px 0;margin:0;font-family:'Segoe UI',Arial,sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 15px 40px rgba(15,23,42,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#0A3D91,#1E6ACB);padding:18px;text-align:center;color:#ffffff;">
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
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Hola ${nombre} ${apellidos},</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">Tu cuenta ha sido creada exitosamente en la plataforma SimuPed. Ya puedes acceder y comenzar tu formación.</p>

              <div style="margin:20px 0;padding:20px 24px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
                <p style="margin:0 0 8px;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">📧 Email:</strong> ${email}</p>
                <p style="margin:0 0 8px;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">👤 Rol:</strong> ${rol || 'No especificado'}</p>
                <p style="margin:0;font-size:15px;color:#0f172a;"><strong style="color:#0A3D91;">🏥 Unidad:</strong> ${unidad || 'No especificada'}</p>
              </div>

              <div style="text-align:center;margin:28px 0;">
                <a href="${baseUrl}/auth" style="display:inline-block;background:#0A3D91;color:#ffffff;padding:14px 32px;border-radius:999px;font-size:16px;font-weight:600;text-decoration:none;box-shadow:0 10px 25px rgba(10,61,145,0.35);">Acceder a SimuPed</a>
              </div>

              <p style="margin:16px 0 12px;font-size:14px;line-height:1.6;color:#475569;">Si tienes alguna duda sobre cómo usar la plataforma, no dudes en contactar con el equipo de soporte.</p>
              <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">¿Dudas? Escríbenos a <a href="mailto:contacto@simuped.com" style="color:#0A3D91;text-decoration:none;">contacto@simuped.com</a>.</p>
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

    await resend.emails.send({
      from: 'SimuPed <notificaciones@simuped.com>',
      to: email,
      subject: 'Cuenta creada - Bienvenido a SimuPed',
      html,
    });

    return res.status(200).json({ ok: true, user_id: userData.user.id });
  } catch (err) {
    console.error('[admin_invite_user] error', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

async function handleSeedProfile(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.body || {};
    if (!user_id) {
      return res.status(400).json({ ok: false, error: 'missing_user_id' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get user metadata
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(user_id);
    if (userError || !userData.user) {
      return res.status(404).json({ ok: false, error: 'user_not_found' });
    }

    const metadata = userData.user.user_metadata || {};
    const nombre = metadata.nombre || '';
    const apellidos = metadata.apellidos || '';
    const email = userData.user.email || '';
    const rol = metadata.rol || null;
    const unidad = metadata.unidad || null;

    // Check if profile already exists
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();

    if (existingProfile) {
      return res.status(400).json({ ok: false, error: 'profile_already_exists' });
    }

    // Create profile
    const { error: insertError } = await admin
      .from('profiles')
      .insert([{
        id: user_id,
        nombre,
        apellidos,
        email,
        rol,
        unidad,
        approved: false
      }]);

    if (insertError) {
      console.error('[seed_profile] insert error', insertError);
      return res.status(500).json({ ok: false, error: 'failed_to_create_profile' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[seed_profile] error', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}