import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
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
