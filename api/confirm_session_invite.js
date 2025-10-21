import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function verifyToken(tokenBase64, secret) {
  try {
    const decoded = JSON.parse(Buffer.from(tokenBase64, 'base64').toString('utf8'));
    const { payload, sig } = decoded;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    const expected = hmac.digest('hex');
    if (expected !== sig) return { ok: false, error: 'invalid_signature' };
    if (payload.exp && Date.now() > payload.exp) return { ok: false, error: 'expired' };
    return { ok: true, payload };
  } catch (e) {
    return { ok: false, error: 'invalid_token' };
  }
}

export default async function handler(req, res) {
  const INVITE_SECRET = process.env.INVITE_TOKEN_SECRET;
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!INVITE_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(500).send('Server not configured');

  try {
    let token = null;
    if (req.method === 'GET') {
      token = req.query.token;
      if (!token) return res.status(400).send('Missing token');
    } else if (req.method === 'POST') {
      token = req.body?.token;
      if (!token) return res.status(400).json({ ok: false, error: 'missing_token' });
    } else {
      return res.status(405).send('Method not allowed');
    }

    const verification = verifyToken(token, INVITE_SECRET);
    if (!verification.ok) {
      if (req.method === 'GET') return res.status(400).send(`Invalid token: ${verification.error}`);
      return res.status(400).json({ ok: false, error: verification.error });
    }

    const { session_id, user_id } = verification.payload;
    if (!session_id || !user_id) {
      if (req.method === 'GET') return res.status(400).send('Invalid token payload');
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { fetch });
    const { error } = await sb.from('scheduled_session_participants').update({ confirmed_at: new Date().toISOString() }).eq('session_id', session_id).eq('user_id', user_id);
    if (error) {
      if (req.method === 'GET') return res.status(500).send('Error confirming invite');
      return res.status(500).json({ ok: false, error: 'update_failed' });
    }

    if (req.method === 'GET') {
      return res.status(302).setHeader('Location', '/sesiones-programadas').send('Confirmed');
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[confirm_session_invite] error', e);
    if (req.method === 'GET') return res.status(500).send('Internal error');
    return res.status(500).json({ ok: false, error: 'internal' });
  }
}
