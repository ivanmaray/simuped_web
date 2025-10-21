import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const { sessionIds } = req.body || {};
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('[scheduled_session_counts] Missing Supabase configuration');
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { fetch });

    const { data, error } = await client
      .from('scheduled_session_participants')
      .select('session_id, confirmed_at')
      .in('session_id', sessionIds);

    if (error) {
      console.error('[scheduled_session_counts] Supabase error', error);
      return res.status(500).json({ ok: false, error: 'supabase_error' });
    }

    const counts = {};
    for (const row of data || []) {
      if (!row?.session_id) continue;
      if (!counts[row.session_id]) {
        counts[row.session_id] = { total: 0, confirmed: 0 };
      }
      counts[row.session_id].total += 1;
      if (row.confirmed_at) counts[row.session_id].confirmed += 1;
    }

    // Ensure all requested ids exist in the response, even if zero participants
    for (const id of sessionIds) {
      if (!counts[id]) counts[id] = { total: 0, confirmed: 0 };
    }

    return res.status(200).json({ ok: true, counts });
  } catch (err) {
    console.error('[scheduled_session_counts] Unexpected error', err);
    return res.status(500).json({ ok: false, error: 'unexpected_error' });
  }
}
