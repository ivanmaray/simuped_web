import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, error: 'missing_email' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error('[resend_verification] Missing service credentials');
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Resend verification email using Supabase Admin API
    const { data, error } = await admin.auth.admin.resend({
      type: 'signup',
      email: email
    });

    if (error) {
      console.error('[resend_verification] Resend error', error);
      return res.status(error.status || 500).json({ ok: false, error: error.message || 'failed_to_resend' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[resend_verification] error', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}