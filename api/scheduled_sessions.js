import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const action = req.query.action || req.body?.action;

  if (!action) {
    return res.status(400).json({ ok: false, error: 'missing_action' });
  }

  switch (action) {
    case 'counts':
      return await handleSessionCounts(req, res);
    case 'roster':
      return await handleSessionRoster(req, res);
    default:
      return res.status(400).json({ ok: false, error: 'invalid_action' });
  }
}

async function handleSessionCounts(req, res) {
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
    console.error('[scheduled_session_counts] error', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

async function handleSessionRoster(req, res) {
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
      console.error('[scheduled_session_roster] Missing Supabase configuration');
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ ok: false, error: 'missing_token' });
    }

    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { fetch });

    const { data: userResp, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userResp?.user) {
      console.warn('[scheduled_session_roster] Invalid token', userErr);
      return res.status(401).json({ ok: false, error: 'invalid_token' });
    }

    const user = userResp.user;
    let isAdmin = Boolean(user?.app_metadata?.is_admin || user?.user_metadata?.is_admin);

    if (!isAdmin) {
      const { data: profileRow, error: profileErr } = await client
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (profileErr) {
        console.error('[scheduled_session_roster] Error loading profile', profileErr);
      }

      isAdmin = Boolean(profileRow?.is_admin);
    }

    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'not_authorized' });
    }

    const { data, error } = await client
      .from('scheduled_session_participants')
      .select(`
        session_id,
        confirmed_at,
        profiles!inner (
          id,
          nombre,
          apellidos,
          email,
          rol,
          unidad
        )
      `)
      .in('session_id', sessionIds);

    if (error) {
      console.error('[scheduled_session_roster] Supabase error', error);
      return res.status(500).json({ ok: false, error: 'supabase_error' });
    }

    const rosters = {};
    for (const row of data || []) {
      if (!row?.session_id) continue;
      if (!rosters[row.session_id]) {
        rosters[row.session_id] = [];
      }

      const profile = row.profiles;
      if (profile) {
        rosters[row.session_id].push({
          id: profile.id,
          nombre: profile.nombre,
          apellidos: profile.apellidos,
          email: profile.email,
          rol: profile.rol,
          unidad: profile.unidad,
          confirmed: Boolean(row.confirmed_at),
          confirmed_at: row.confirmed_at
        });
      }
    }

    // Ensure all requested ids exist in the response, even if empty rosters
    for (const id of sessionIds) {
      if (!rosters[id]) rosters[id] = [];
    }

    return res.status(200).json({ ok: true, rosters });
  } catch (err) {
    console.error('[scheduled_session_roster] error', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}