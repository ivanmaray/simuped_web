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

      if (profileRow?.is_admin === true) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }

    const { data: participantRows, error: participantsErr } = await client
      .from('scheduled_session_participants')
      .select('id, session_id, user_id, registered_at, confirmed_at')
      .in('session_id', sessionIds)
      .order('registered_at', { ascending: true });

    if (participantsErr) {
      console.error('[scheduled_session_roster] Supabase error', participantsErr);
      return res.status(500).json({ ok: false, error: 'supabase_error' });
    }

    const userIds = Array.from(new Set((participantRows || []).map((row) => row.user_id).filter(Boolean)));
    let profilesById = {};

    if (userIds.length > 0) {
      const { data: profileRows, error: profileErr } = await client
        .from('profiles')
        .select('id, nombre, apellidos, email')
        .in('id', userIds);

      if (profileErr) {
        console.error('[scheduled_session_roster] Error loading profiles', profileErr);
      } else {
        profilesById = (profileRows || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
    }

    const rosters = {};
    for (const row of participantRows || []) {
      if (!row?.session_id) continue;
      if (!rosters[row.session_id]) {
        rosters[row.session_id] = [];
      }
      const profile = row.user_id ? profilesById[row.user_id] : null;
      const nameParts = profile ? [profile.nombre, profile.apellidos].filter(Boolean) : [];
      const displayName = nameParts.length > 0
        ? nameParts.join(' ').trim()
        : (profile?.email || 'Participante sin nombre');

      rosters[row.session_id].push({
        id: row.id,
        user_id: row.user_id,
        name: displayName,
        email: profile?.email || null,
        registered_at: row.registered_at,
        confirmed_at: row.confirmed_at
      });
    }

    for (const id of sessionIds) {
      if (!rosters[id]) {
        rosters[id] = [];
      } else {
        rosters[id].sort((a, b) => {
          const timeA = a.confirmed_at || a.registered_at || 0;
          const timeB = b.confirmed_at || b.registered_at || 0;
          return new Date(timeA).getTime() - new Date(timeB).getTime();
        });
      }
    }

    return res.status(200).json({ ok: true, rosters });
  } catch (err) {
    console.error('[scheduled_session_roster] Unexpected error', err);
    return res.status(500).json({ ok: false, error: 'unexpected_error' });
  }
}
