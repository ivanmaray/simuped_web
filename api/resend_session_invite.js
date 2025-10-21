import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function signPayload(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  const { session_id, user_id, session_name, session_date, session_location } = req.body || {};
  if (!session_id || !user_id) return res.status(400).json({ ok: false, error: 'Missing parameters' });

  const INVITE_SECRET = process.env.INVITE_TOKEN_SECRET;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!INVITE_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).json({ ok: false, error: 'Server not configured' });

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { fetch });
    const { data: profile, error: profErr } = await sb.from('profiles').select('id, nombre, apellidos, email').eq('id', user_id).single();
    if (profErr || !profile) return res.status(404).json({ ok: false, error: 'profile_not_found' });

    const tokenPayload = { session_id, user_id, exp: Date.now() + (1000 * 60 * 60 * 24 * 7) };
    const sig = signPayload(tokenPayload, INVITE_SECRET);
    const token = Buffer.from(JSON.stringify({ payload: tokenPayload, sig })).toString('base64');
    const inviteLink = `${process.env.VITE_APP_URL || ''}/confirm-invite?token=${encodeURIComponent(token)}`;

    // Call notify endpoint to send invite email
    await fetch(`${process.env.VITE_APP_URL || ''}/api/notify_session_registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: profile.email,
        userName: [profile.nombre, profile.apellidos].filter(Boolean).join(' ') || 'Usuario',
        sessionName: session_name || 'Sesión programada',
        sessionDate: session_date || new Date().toISOString(),
        sessionLocation: session_location || '',
        sessionCode: (session_id || '').substring(0,6).toUpperCase(),
        inviteLink
      })
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[resend_session_invite] error', e);
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}
