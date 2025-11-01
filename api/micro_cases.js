import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[micro_cases] Missing Supabase configuration');
    throw new Error('server_not_configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch }
  });
}

async function getUserFromRequest(req, client) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') return null;
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error) {
    console.warn('[micro_cases] getUser token error', error);
    return null;
  }
  return data?.user ?? null;
}

async function handleListCases(req, res) {
  try {
    const client = getServiceClient();
    const status = (req.query.status || 'published').toString();
    const includeDrafts = status !== 'published';

    const user = await getUserFromRequest(req, client);
    const userId = user?.id || null;

    const filters = includeDrafts && userId
      ? { or: `is_published.eq.true,created_by.eq.${userId}` }
      : { is_published: true };

    const query = client.from('micro_cases_overview')
      .select('id, slug, title, summary, estimated_minutes, difficulty, recommended_roles, recommended_units, is_published, updated_at, node_count')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (filters.is_published) {
      query.eq('is_published', true);
    } else if (filters.or) {
      query.or(filters.or);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[micro_cases] list error', error);
      return res.status(500).json({ ok: false, error: 'supabase_error', detail: error.message });
    }

    return res.status(200).json({ ok: true, cases: data || [] });
  } catch (err) {
    if (err.message === 'server_not_configured') {
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }
    console.error('[micro_cases] list unexpected', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

async function handleGetCase(req, res) {
  try {
    const client = getServiceClient();
    const id = (req.query.id || req.body?.id || '').toString();
    if (!id) {
      return res.status(400).json({ ok: false, error: 'missing_case_id' });
    }

    const { data: caseRows, error: caseErr } = await client
      .from('micro_cases')
      .select('id, slug, title, summary, estimated_minutes, difficulty, recommended_roles, recommended_units, is_published, start_node_id')
      .eq('id', id)
      .limit(1);

    if (caseErr) {
      console.error('[micro_cases] get case error', caseErr);
      return res.status(500).json({ ok: false, error: 'supabase_error', detail: caseErr.message });
    }
    const microCase = caseRows?.[0];
    if (!microCase) {
      return res.status(404).json({ ok: false, error: 'case_not_found' });
    }

    if (!microCase.is_published) {
      // Require ownership
      const user = await getUserFromRequest(req, client);
      if (!user) {
        return res.status(403).json({ ok: false, error: 'not_authorized' });
      }
      const { data: ownership } = await client
        .from('micro_cases')
        .select('id')
        .eq('id', id)
        .eq('created_by', user.id)
        .limit(1);
      if (!ownership || ownership.length === 0) {
        return res.status(403).json({ ok: false, error: 'not_authorized' });
      }
    }

    const { data: nodeRows, error: nodesErr } = await client
      .from('micro_case_nodes')
      .select('id, case_id, kind, body_md, media_url, order_index, is_terminal, auto_advance_to, metadata')
      .eq('case_id', id)
      .order('order_index', { ascending: true });

    if (nodesErr) {
      console.error('[micro_cases] nodes error', nodesErr);
      return res.status(500).json({ ok: false, error: 'supabase_error', detail: nodesErr.message });
    }

    const nodeIds = (nodeRows || []).map((node) => node.id);

    const { data: optionsRows, error: optionsErr } = nodeIds.length === 0
      ? { data: [], error: null }
      : await client
        .from('micro_case_options')
        .select('id, node_id, label, next_node_id, feedback_md, score_delta, is_critical')
        .in('node_id', nodeIds)
        .order('created_at', { ascending: true });

    if (optionsErr) {
      console.error('[micro_cases] options error', optionsErr);
      return res.status(500).json({ ok: false, error: 'supabase_error', detail: optionsErr.message });
    }

    const optionsByNode = {};
    for (const option of optionsRows || []) {
      if (!optionsByNode[option.node_id]) optionsByNode[option.node_id] = [];
      optionsByNode[option.node_id].push(option);
    }

    const nodes = (nodeRows || []).map((node) => ({
      ...node,
      options: optionsByNode[node.id] || []
    }));

    return res.status(200).json({ ok: true, case: { ...microCase, nodes } });
  } catch (err) {
    if (err.message === 'server_not_configured') {
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }
    console.error('[micro_cases] get unexpected', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

async function handleSubmitAttempt(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  try {
    const client = getServiceClient();
    const user = await getUserFromRequest(req, client);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'missing_token' });
    }

    const { caseId, steps, completed, scoreTotal, durationSeconds, status } = req.body || {};
    if (!caseId || !Array.isArray(steps)) {
      return res.status(400).json({ ok: false, error: 'invalid_payload' });
    }

    const attemptPayload = {
      case_id: caseId,
      user_id: user.id,
      score_total: typeof scoreTotal === 'number' ? scoreTotal : 0,
      duration_seconds: typeof durationSeconds === 'number' ? durationSeconds : null,
      status: completed ? 'completed' : (status || 'in_progress'),
      completed_at: completed ? new Date().toISOString() : null
    };

    const { data: attemptRows, error: insertErr } = await client
      .from('micro_case_attempts')
      .insert([attemptPayload])
      .select('id')
      .limit(1);

    if (insertErr) {
      console.error('[micro_cases] attempt insert error', insertErr);
      return res.status(500).json({ ok: false, error: 'supabase_error', detail: insertErr.message });
    }

    const attemptId = attemptRows?.[0]?.id;
    if (!attemptId) {
      return res.status(500).json({ ok: false, error: 'insert_failed' });
    }

    const stepRows = steps
      .filter((step) => step && step.nodeId)
      .map((step) => ({
        attempt_id: attemptId,
        node_id: step.nodeId,
        option_id: step.optionId || null,
        outcome_label: step.outcomeLabel || null,
        score_delta: typeof step.scoreDelta === 'number' ? step.scoreDelta : 0,
        elapsed_ms: typeof step.elapsedMs === 'number' ? step.elapsedMs : null
      }));

    if (stepRows.length > 0) {
      const { error: stepsErr } = await client
        .from('micro_case_attempt_steps')
        .insert(stepRows);
      if (stepsErr) {
        console.error('[micro_cases] steps insert error', stepsErr);
        // Non-blocking: attempt already created. Return ok but warn.
        return res.status(200).json({ ok: true, attempt_id: attemptId, warning: 'steps_failed' });
      }
    }

    return res.status(200).json({ ok: true, attempt_id: attemptId });
  } catch (err) {
    if (err.message === 'server_not_configured') {
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }
    console.error('[micro_cases] attempt unexpected', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}

export default async function handler(req, res) {
  const action = (req.query.action || req.body?.action || 'list').toString();

  if (req.method === 'GET' && (action === 'list' || action === 'published')) {
    return handleListCases(req, res);
  }

  if (req.method === 'GET' && action === 'get') {
    return handleGetCase(req, res);
  }

  if (action === 'submit') {
    return handleSubmitAttempt(req, res);
  }

  return res.status(400).json({ ok: false, error: 'invalid_action' });
}
