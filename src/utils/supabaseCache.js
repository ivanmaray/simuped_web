const PROFILE_TTL = 5 * 60 * 1000; // 5 minutos
const SCENARIO_TTL = 5 * 60 * 1000;
const BRIEF_TTL = 2 * 60 * 1000;
const NOW_TTL = 60 * 1000;

const profileCache = new Map();
const scenarioCache = new Map();
const briefCache = new Map();

const nowCache = {
	value: null,
	timestamp: 0,
	inflight: null,
};

function isFresh(entry, ttlMs, force) {
	if (force) return false;
	if (!entry) return false;
	return Date.now() - entry.timestamp < ttlMs;
}

function remember(cache, key, value) {
	cache.set(key, {
		value,
		timestamp: Date.now(),
	});
	return value;
}

function safeParseJson(payload) {
	if (payload == null) return payload;
	if (Array.isArray(payload)) return payload;
	if (typeof payload !== "string") return payload;
	const trimmed = payload.trim();
	if (!trimmed) return payload;
	if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return payload;
	try {
		return JSON.parse(trimmed);
	} catch {
		return payload;
	}
}

function normalizeBrief(raw) {
	if (!raw) return null;
	const next = { ...raw };
	const jsonFields = [
		"chips",
		"demographics",
		"history",
		"triangle",
		"red_flags",
		"key_objectives",
		"objectives",
		"pearls",
		"exam",
		"labs",
		"vitals",
		"resources",
		"bibliography",
		"references",
	];

	for (const field of jsonFields) {
		if (field in next) {
			next[field] = safeParseJson(next[field]);
		}
	}

	return next;
}

export async function getNowUtcCached(client, options = {}) {
	if (!client || typeof client.rpc !== "function") return null;
	const ttl = options.ttlMs ?? NOW_TTL;
	if (isFresh(nowCache, ttl, options.forceRefresh)) {
		return nowCache.value;
	}
	if (nowCache.inflight) {
		try {
			return await nowCache.inflight;
		} catch {
			return nowCache.value;
		}
	}

	nowCache.inflight = (async () => {
		try {
			const { data, error } = await client.rpc("now_utc");
			if (error) throw error;
			const value = data ?? null;
			nowCache.value = value;
			nowCache.timestamp = Date.now();
			return value;
		} catch (err) {
			console.warn("[supabaseCache] now_utc error", err);
			return nowCache.value;
		} finally {
			nowCache.inflight = null;
		}
	})();

	return nowCache.inflight;
}

export async function getProfileCached(client, userId, options = {}) {
	if (!client || !userId) return null;
	const key = String(userId);
	const ttl = options.ttlMs ?? PROFILE_TTL;
	const cached = profileCache.get(key);

	if (isFresh(cached, ttl, options.forceRefresh)) {
		return cached.value;
	}

	try {
		const { data, error } = await client
			.from("profiles")
			.select(
				"id, email, nombre, apellidos, dni, rol, unidad, areas_interes, approved, is_admin, updated_at, created_at"
			)
			.eq("id", userId)
			.maybeSingle();

		if (error) throw error;
		const value = data ?? null;
		return remember(profileCache, key, value);
	} catch (err) {
		console.warn("[supabaseCache] profile error", { userId, err });
		return cached ? cached.value : null;
	}
}

export async function getScenarioCached(client, scenarioId, options = {}) {
	if (!client || scenarioId == null) return null;
	const key = String(scenarioId);
	const ttl = options.ttlMs ?? SCENARIO_TTL;
	const cached = scenarioCache.get(key);

	if (isFresh(cached, ttl, options.forceRefresh)) {
		return cached.value;
	}

	try {
		const { data, error } = await client
			.from("scenarios")
			.select("*")
			.eq("id", scenarioId)
			.maybeSingle();

		if (error) throw error;
		const value = data ?? null;
		return remember(scenarioCache, key, value);
	} catch (err) {
		console.warn("[supabaseCache] scenario error", { scenarioId, err });
		return cached ? cached.value : null;
	}
}

export async function getCaseBriefCached(client, scenarioId, options = {}) {
	if (!client || scenarioId == null) return null;
	const key = String(scenarioId);
	const ttl = options.ttlMs ?? BRIEF_TTL;
	const cached = briefCache.get(key);

	if (isFresh(cached, ttl, options.forceRefresh)) {
		return cached.value;
	}

	try {
		const { data, error } = await client
			.from("case_briefs")
			.select("*")
			.eq("scenario_id", scenarioId)
			.maybeSingle();

		if (error) throw error;
		const normalized = normalizeBrief(data);
		return remember(briefCache, key, normalized);
	} catch (err) {
		console.warn("[supabaseCache] brief error", { scenarioId, err });
		return cached ? cached.value : null;
	}
}

export function invalidateProfileCache(userId) {
	if (userId == null) {
		profileCache.clear();
	} else {
		profileCache.delete(String(userId));
	}
}

export function invalidateScenarioCache(scenarioId) {
	if (scenarioId == null) {
		scenarioCache.clear();
	} else {
		scenarioCache.delete(String(scenarioId));
	}
}

export function invalidateBriefCache(scenarioId) {
	if (scenarioId == null) {
		briefCache.clear();
	} else {
		briefCache.delete(String(scenarioId));
	}
}

export function clearSupabaseCache() {
	profileCache.clear();
	scenarioCache.clear();
	briefCache.clear();
	nowCache.value = null;
	nowCache.timestamp = 0;
}

export default {
	getNowUtcCached,
	getProfileCached,
	getScenarioCached,
	getCaseBriefCached,
	invalidateProfileCache,
	invalidateScenarioCache,
	invalidateBriefCache,
	clearSupabaseCache,
};
