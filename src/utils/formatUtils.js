const LEVEL_MAP = new Map(
	[
		["1", "Básico"],
		["nivel 1", "Básico"],
		["basico", "Básico"],
		["básico", "Básico"],
		["basic", "Básico"],
		["starter", "Básico"],
		["intro", "Básico"],

		["2", "Medio"],
		["nivel 2", "Medio"],
		["medio", "Medio"],
		["intermedio", "Medio"],
		["medium", "Medio"],

		["3", "Avanzado"],
		["nivel 3", "Avanzado"],
		["avanzado", "Avanzado"],
		["advanced", "Avanzado"],
		["expert", "Avanzado"],

		["4", "Experto"],
		["nivel 4", "Experto"],
		["experto", "Experto"],
	]
);

const MODE_MAP = new Map(
	[
		["online", "Online"],
		["en linea", "Online"],
		["en línea", "Online"],
		["virtual", "Online"],

		["presencial", "Presencial"],
		["on site", "Presencial"],
		["onsite", "Presencial"],

		["hibrido", "Híbrido"],
		["híbrido", "Híbrido"],
		["mixto", "Híbrido"],
		["dual", "Dual"],
		["combinado", "Híbrido"],
	]
);

const ROLE_PATTERNS = [
	{ test: /medic/, label: "Médico" },
	{ test: /enfer/, label: "Enfermería" },
	{ test: /farm/, label: "Farmacia" },
	{ test: /residen|mir/, label: "Residente" },
	{ test: /admin|gestor/, label: "Administrador" },
	{ test: /instructor|tutor/, label: "Instructor" },
	{ test: /supervisor/, label: "Supervisor" },
	{ test: /coordinador/, label: "Coordinador" },
];

function capitalizeWords(raw) {
	if (!raw) return "";
	return String(raw)
		.trim()
		.split(/\s+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

export function formatLevel(level) {
	if (level == null) return "";
	const key = String(level).trim().toLowerCase();
	if (!key) return "";
	if (LEVEL_MAP.has(key)) return LEVEL_MAP.get(key);
	return capitalizeWords(key);
}

export function formatMode(mode) {
	if (mode == null) return "";
	const key = String(mode).trim().toLowerCase();
	if (!key) return "";
	if (MODE_MAP.has(key)) return MODE_MAP.get(key);
	return capitalizeWords(key);
}

export function formatRole(rol) {
	if (rol == null) return "";
	const key = String(rol).trim().toLowerCase();
	if (!key) return "";
	const match = ROLE_PATTERNS.find((item) => item.test.test(key));
	if (match) return match.label;
	return capitalizeWords(key);
}

export function clearFormatCaches() {
	// Placeholder in case we add memoization later; keeping exported to avoid breaking imports.
	return undefined;
}

export default {
	formatLevel,
	formatMode,
	formatRole,
};
