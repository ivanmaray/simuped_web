// src/pages/Perfil.jsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/outline";
import { supabase } from "../../../supabaseClient";
import Navbar from "../../../components/Navbar.jsx";
import { MEDICAL_BADGES, BADGE_CATEGORIES } from "../../../utils/badgeSystem.js";

const COLORS = {
  primary: "#1E6ACB",
};

const UNIDADES = ["Farmacia", "UCI", "Urgencias"];

const BADGE_LOOKUP = Object.values(MEDICAL_BADGES).reduce((acc, badge) => {
  acc[badge.id] = badge;
  return acc;
}, {});

const DEFAULT_BADGE_STYLES = "bg-slate-200 text-slate-700";

function mapEarnedBadge(row) {
  const joined = row?.badges || row?.badge || null;
  const meta = BADGE_LOOKUP[row?.badge_id] || null;
  const title = joined?.title || meta?.title || row?.badge_id || "Logro sin nombre";
  const description = joined?.description || meta?.description || row?.earned_for || "";
  const icon = joined?.icon || meta?.icon || "🏅";
  const category = joined?.category || meta?.category || "achievement";
  const type = joined?.type || meta?.type || "";
  const colorClass = joined?.color || meta?.color || DEFAULT_BADGE_STYLES;

  return {
    badgeId: row?.badge_id || "",
    title,
    description,
    icon,
    category,
    type,
    colorClass,
    earnedDate: row?.earned_date || null,
    earnedFor: row?.earned_for || "",
  };
}

function getAchievementLevelDescriptor(onlineAttempted, presencialAttempted) {
  const total = onlineAttempted + presencialAttempted;

  if (total >= 25) {
    return {
      id: "achievement_level_experto_profesional",
      icon: "🏆",
      title: "Experto Profesional",
      description: "Especialista multidisciplinar consolidado",
      color: "bg-yellow-500 text-yellow-900",
    };
  }

  if (total >= 20) {
    return {
      id: "achievement_level_coordinador_experto",
      icon: "⭐",
      title: "Coordinador Experto",
      description: "Gestión avanzada de equipos de crisis",
      color: "bg-red-500 text-white",
    };
  }

  if (total >= 15) {
    return {
      id: "achievement_level_jefe_equipo",
      icon: "👨‍💼",
      title: "Jefe de Equipo",
      description: "Líder reconocido en simulación multimodal",
      color: "bg-purple-500 text-purple-900",
    };
  }

  if (total >= 12) {
    return {
      id: "achievement_level_supervisor_senior",
      icon: "👥",
      title: "Supervisor Senior",
      description: "Experiencia en múltiples escenarios críticos",
      color: "bg-orange-500 text-orange-900",
    };
  }

  if (total >= 8) {
    return {
      id: "achievement_level_especialista_avanzado",
      icon: "🔬",
      title: "Especialista Avanzado",
      description: "Dominio en protocolos de alta complejidad",
      color: "bg-blue-500 text-blue-900",
    };
  }

  if (total >= 5) {
    return {
      id: "achievement_level_profesional_competente",
      icon: "⚡",
      title: "Profesional Competente",
      description: "Habilidades sólidas en situaciones críticas",
      color: "bg-green-500 text-green-900",
    };
  }

  if (total >= 3) {
    return {
      id: "achievement_level_profesional_formacion",
      icon: "📚",
      title: "Profesional en Formación",
      description: "Desarrollo de destrezas técnicas avanzadas",
      color: "bg-indigo-500 text-indigo-900",
    };
  }

  if (total >= 1) {
    return {
      id: "achievement_level_nuevos_compromisos",
      icon: "🎯",
      title: "Nuevos Compromisos",
      description: "Iniciativa y motivación profesional activa",
      color: "bg-teal-500 text-teal-900",
    };
  }

  return {
    id: "achievement_level_primeros_pasos",
    icon: "🌱",
    title: "Primeros Pasos",
    description: "Inicio del camino profesional en simulación",
    color: "bg-gray-500 text-gray-900",
  };
}

function formatRoleLabel(rol) {
  const key = String(rol || "").toLowerCase();
  if (key.includes("farm")) return "Farmacia";
  if (key.includes("enfer")) return "Enfermería";
  if (key.includes("med")) return "Medicina";
  return key ? key[0].toUpperCase() + key.slice(1) : "—";
}

function formatDateShort(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function HeroStat({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-white/70">{label}</p>
        <p className="text-xl font-semibold text-white leading-tight">{value || "—"}</p>
        {helper ? <p className="text-[11px] text-white/70 mt-1">{helper}</p> : null}
      </div>
    </div>
  );
}

// Helpers seguros para JSON (compatibles si la columna es TEXT o JSONB)
function safeParseJSON(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}
// Helpers DNI
function normalizarDNI(v) {
  return (v || "").toString().toUpperCase().replace(/\s|-/g, "");
}

// Valida DNI (12345678Z) o NIE (X1234567L, Y..., Z...) con letra de control correcta
function validarDNI(v) {
  const dni = normalizarDNI(v);

  const isDNI = /^\d{8}[A-Z]$/.test(dni);
  const isNIE = /^[XYZ]\d{7}[A-Z]$/.test(dni);
  if (!isDNI && !isNIE) return false;

  // Obtiene número sin la letra final
  let num = dni.slice(0, -1);
  const letter = dni.slice(-1);

  // Para NIE, sustituye la inicial X/Y/Z por 0/1/2
  if (/^[XYZ]/.test(num)) {
    const map = { X: "0", Y: "1", Z: "2" };
    num = map[num[0]] + num.slice(1);
  }

  const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
  const expected = letters[parseInt(num, 10) % 23];
  return expected === letter;
}

export default function Principal_Perfil() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [dniError, setDniError] = useState("");

  // Campos de perfil
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [rol, setRol] = useState(""); // "medico" | "enfermeria" | "farmacia"
  const [unidad, setUnidad] = useState(""); // Farmacia | UCI | Urgencias
  const [areasInteres, setAreasInteres] = useState([]); // array de strings
  const [categorias, setCategorias] = useState([]); // categories desde Supabase
  const [statusInfo, setStatusInfo] = useState({
    approved: false,
    approvedAt: null,
    verified: false,
    verifiedAt: null,
    notified: false,
    notifiedAt: null,
  });
  const [achievements, setAchievements] = useState([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  // Password reset flow
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        console.error("[Perfil] getSession error:", error);
        setErrorMsg(error.message || "Error obteniendo sesión");
      }
  const sess = data?.session ?? null;
      setSession(sess);
      if (!sess) {
        setLoading(false);
        setLoadingAchievements(false);
        navigate("/", { replace: true });
        return;
      }

      // Detect password setup intent
      try {
        const setPw = (searchParams.get("set_password") || "").toString() === "1";
        const url = new URL(window.location.href);
        const isRecovery = (url.searchParams.get("type") || "").toLowerCase() === "recovery";
        const hasAccessToken = window.location.hash.includes("access_token=");
        if (setPw || isRecovery || hasAccessToken) {
          setShowSetPassword(true);
        }
      } catch {}

      // Cargar perfil desde 'profiles' con fallback si falta areas_interes
      let prof = null;
      let pErr = null;
      {
        const res = await supabase
          .from("profiles")
          .select("id, nombre, apellidos, dni, rol, unidad, areas_interes, approved, approved_at, verified_at, notified_at")
          .eq("id", sess.user.id)
          .maybeSingle();
        prof = res.data ?? null;
        pErr = res.error ?? null;

        // Si la columna no existe (42703), reintenta sin areas_interes
        if (pErr?.code === "42703" || (pErr?.message || "").toLowerCase().includes("areas_interes")) {
          console.warn("[Perfil] 'areas_interes' no existe aún. Reintentando sin esa columna.");
          const res2 = await supabase
            .from("profiles")
            .select("id, nombre, apellidos, dni, rol, unidad, approved, approved_at, verified_at, notified_at")
            .eq("id", sess.user.id)
            .maybeSingle();
          prof = res2.data ?? null;
          pErr = res2.error ?? null;
        }
      }

      if (pErr) {
        console.warn("[Perfil] profiles select error:", pErr);
      }

      const meta = sess.user?.user_metadata || {};

      setNombre(prof?.nombre ?? meta.nombre ?? "");
      setApellidos(prof?.apellidos ?? meta.apellidos ?? "");
      setEmail(sess.user?.email ?? "");
      setDni(prof?.dni ?? "");
      setDniError("");
      const newRol = (prof?.rol ?? meta.rol ?? "").toString().toLowerCase();
      setRol(newRol);
      setUnidad((prof?.unidad ?? "").toString());

      // Normaliza areas_interes (jsonb o TEXT con JSON)
      const rawAI = prof?.areas_interes;
      const ai = safeParseJSON(rawAI) || [];
      setAreasInteres(Array.isArray(ai) ? ai : []);

      const approvedAt = prof?.approved_at ?? null;
      const verifiedAt = prof?.verified_at ?? sess?.user?.email_confirmed_at ?? meta.email_verified_at ?? null;
      const notifiedAt = prof?.notified_at ?? null;
      setStatusInfo({
        approved: Boolean(prof?.approved),
        approvedAt,
        verified: Boolean(verifiedAt),
        verifiedAt,
        notified: Boolean(notifiedAt),
        notifiedAt,
      });

      // ⤵️ Backfill: si faltan campos clave en profiles, persistir desde user_metadata
      try {
        if (prof && sess?.user?.id) {
          const patch = {};

          // DNI desde metadata si falta en profiles
          if (!prof.dni && meta.dni) {
            patch.dni = normalizarDNI(meta.dni);
          }

          // Rol: normalizar variaciones de UI a valores del modelo
          if (!prof.rol && meta.rol) {
            const raw = String(meta.rol || "").toLowerCase();
            const roleMap = {
              pediatra: "medico",
              medico: "medico",
              enfermera: "enfermeria",
              enfermeria: "enfermeria",
              farmaceutico: "farmacia",
              farmacia: "farmacia",
            };
            const mapped = roleMap[raw] || null;
            if (mapped) patch.rol = mapped;
          }

          // Unidad
          if (!prof.unidad && meta.unidad) {
            patch.unidad = String(meta.unidad);
          }

          // Áreas de interés (si en profiles está vacío y en meta hay valores)
          if (
            (prof.areas_interes == null ||
              (Array.isArray(prof.areas_interes) && prof.areas_interes.length === 0)) &&
            Array.isArray(meta.areas_interes) &&
            meta.areas_interes.length
          ) {
            patch.areas_interes = meta.areas_interes;
          }

          if (Object.keys(patch).length > 0) {
            patch.updated_at = new Date().toISOString();
            await supabase.from("profiles").update(patch).eq("id", sess.user.id);
          }
        }
      } catch (e) {
        console.warn("[Perfil] backfill metadata→profiles omitido:", e);
      }

      // Cargar categorías dinámicamente desde public.categories
      const { data: cats, error: cErr } = await supabase
        .from("categories")
        .select("id, name")
        .order("name", { ascending: true });
      if (!mounted) return;
      if (cErr) {
        console.error("[Perfil] error cargando categorías:", cErr);
        setCategorias([]);
      } else {
        setCategorias(cats || []);
      }

      setLoadingAchievements(true);

      const normalizeMode = (mode) => {
        const arr = Array.isArray(mode) ? mode : mode ? [mode] : [];
        return arr.map((m) => String(m || "").toLowerCase());
      };

      let earnedList = [];
      try {
        const BADGES_ENABLED = String(import.meta.env.VITE_ENABLE_USER_BADGES ?? 'true').toLowerCase() !== 'false';
        if (BADGES_ENABLED) {
          const { data: badgeRows, error: badgeErr } = await supabase
            .from("user_badges")
            .select(
              "badge_id, earned_date, earned_for"
            )
            .eq("user_id", sess.user.id)
            .order("earned_date", { ascending: false });

          if (badgeErr) throw badgeErr;
          earnedList = (badgeRows || []).map(mapEarnedBadge);
        }
      } catch (achErr) {
        // Silencia el caso de tabla inexistente en el schema cache (PGRST205)
        const msg = (achErr?.message || '').toLowerCase();
        if (achErr?.code !== 'PGRST205' && !msg.includes("could not find the table 'public.user_badges'")) {
          console.warn("[Perfil] error cargando logros:", achErr);
        }
        earnedList = [];
      }

      let derivedList = [];
      try {
        const { data: attemptsRaw, error: attemptsError } = await supabase
          .from("attempts")
          .select(
            `scenario_id, started_at, finished_at, scenarios (mode)`
          )
          .eq("user_id", sess.user.id)
          .order("started_at", { ascending: false });

        if (attemptsError) throw attemptsError;

        const attemptsByScenario = new Map();
        for (const row of attemptsRaw || []) {
          const scenarioId = row?.scenario_id;
          if (!scenarioId) continue;
          const modeNormalized = normalizeMode(row?.scenarios?.mode);
          if (!attemptsByScenario.has(scenarioId)) {
            attemptsByScenario.set(scenarioId, {
              mode_normalized: modeNormalized,
              last_started_at: row?.started_at || row?.finished_at || null,
            });
          } else {
            const entry = attemptsByScenario.get(scenarioId);
            const attemptTime = row?.started_at || row?.finished_at || null;
            if (attemptTime) {
              const current = entry.last_started_at ? new Date(entry.last_started_at).getTime() : 0;
              const next = new Date(attemptTime).getTime();
              if (next > current) entry.last_started_at = attemptTime;
            }
            entry.mode_normalized = modeNormalized;
          }
        }

        const attemptsWithData = Array.from(attemptsByScenario.values()).sort((a, b) => {
          const aDate = a.last_started_at ? new Date(a.last_started_at).getTime() : 0;
          const bDate = b.last_started_at ? new Date(b.last_started_at).getTime() : 0;
          return bDate - aDate;
        });

        const onlineAttempted = attemptsWithData.filter((row) => (row.mode_normalized || []).includes("online")).length;
        const presencialAttempted = attemptsWithData.filter((row) => (row.mode_normalized || []).includes("presencial")).length;
        const totalUnique = onlineAttempted + presencialAttempted;

        if (totalUnique > 0) {
          const levelBadge = getAchievementLevelDescriptor(onlineAttempted, presencialAttempted);
          derivedList.push({
            badgeId: levelBadge.id,
            title: levelBadge.title,
            description: levelBadge.description,
            icon: levelBadge.icon,
            category: "achievement",
            type: "nivel",
            colorClass: levelBadge.color,
            earnedDate: attemptsWithData[0]?.last_started_at || null,
            earnedFor: `Simulaciones completadas: ${totalUnique}`,
          });
        }
      } catch (attemptErr) {
        console.warn("[Perfil] no se pudieron calcular logros derivados:", attemptErr);
      }

      if (mounted) {
        const combined = [...earnedList];
        const seen = new Set(combined.map((item) => item.badgeId));
        for (const derived of derivedList) {
          if (!seen.has(derived.badgeId)) {
            combined.push(derived);
            seen.add(derived.badgeId);
          }
        }
        combined.sort((a, b) => {
          const aTime = a.earnedDate ? new Date(a.earnedDate).getTime() : 0;
          const bTime = b.earnedDate ? new Date(b.earnedDate).getTime() : 0;
          return bTime - aTime;
        });
        setAchievements(combined);
        setLoadingAchievements(false);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleUpdatePassword(e) {
    e?.preventDefault?.();
    setPwMsg("");
    if (!newPassword || newPassword.length < 8) {
      setPwMsg("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== newPassword2) {
      setPwMsg("Las contraseñas no coinciden.");
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        const raw = (error.message || '').toLowerCase();
        if (raw.includes('weak')) setPwMsg('La contraseña no cumple los requisitos.');
        else setPwMsg(error.message || 'No se pudo actualizar la contraseña.');
        return;
      }
      setPwMsg("Contraseña actualizada ✔");
      setShowSetPassword(false);
      setNewPassword("");
      setNewPassword2("");
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('set_password');
        window.history.replaceState({}, '', url.toString());
      } catch {}
    } catch (ex) {
      setPwMsg("Error inesperado actualizando la contraseña.");
    }
  }

  async function handleGuardar(e) {
    e.preventDefault();
    if (!session?.user?.id) return;

    setSaving(true);
    setErrorMsg("");
    setOkMsg("");
    setDniError("");

    // Si el email cambió, intentamos actualizarlo en auth
    const currentEmail = session?.user?.email ?? "";
    if (email && email !== currentEmail) {
      const { error: emailErr } = await supabase.auth.updateUser({ email });
      if (emailErr) {
        setSaving(false);
        setErrorMsg("No se pudo actualizar el email: " + (emailErr.message || ""));
        return;
      }
    }
    // Validaciones
    const dniNorm = normalizarDNI(dni);
    if (!dniNorm) {
      setDniError("El DNI es obligatorio.");
      setSaving(false);
      return;
    }
    if (!validarDNI(dniNorm)) {
      setDniError("El DNI no tiene un formato válido (ej.: 12345678Z o X1234567L).");
      setSaving(false);
      return;
    }

    if (!nombre.trim()) {
      setErrorMsg("El nombre es obligatorio.");
      setSaving(false);
      return;
    }
    if (!rol) {
      setErrorMsg("Selecciona tu rol.");
      setSaving(false);
      return;
    }
    if (!unidad) {
      setErrorMsg("Selecciona tu unidad.");
      setSaving(false);
      return;
    }

    // Payload SOLO con campos editables (sin id)
    const payload = {
      nombre: nombre.trim(),
      apellidos: apellidos.trim(),
      dni: dniNorm,
      rol,                 // 'medico' | 'enfermeria' | 'farmacia'
      unidad,              // Farmacia | UCI | Urgencias
      // Guardamos como jsonb array
      areas_interes: Array.isArray(areasInteres) ? areasInteres : [],
      updated_at: new Date().toISOString(),
    };

    // Log para depuración de tipos enviados y payload
    console.log("[Perfil] payload enviado:", payload);

    // UPDATE en vez de UPSERT para no chocar con RLS de INSERT
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", session.user.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      console.error("[Perfil] update error:", error);
      setOkMsg("");
      // Mensajes más claros según constraint o columna
      const code = error.code || "";
      const msg = (error.message || "").toLowerCase();

      // Detectores por constraint/campo
      const isDniCheck = msg.includes("profiles_dni_check");
      const isDniUnique = msg.includes("profiles_dni_unique");
      const isAreasCheck = msg.includes("areas_interes_valid") || msg.includes("areas_interes");
      const isRolCheck = msg.includes("profiles_rol_check");
      const isUnidadCheck = msg.includes("profiles_unidad_check");

      // Log crudo para depuración
      console.error("[Perfil] update failed raw:", error);

      if (code === "23514") {
        if (isDniCheck) {
          setDniError("El DNI no cumple el formato requerido por el sistema.");
        } else if (isAreasCheck) {
          setErrorMsg("Formato de 'Áreas de interés' no válido. Vuelve a seleccionar las áreas e inténtalo de nuevo.");
        } else if (isRolCheck) {
          setErrorMsg("Rol inválido. Selecciona un rol permitido.");
        } else if (isUnidadCheck) {
          setErrorMsg("Unidad inválida. Selecciona una unidad permitida.");
        } else {
          setErrorMsg("Hay un dato que no cumple las reglas del sistema. Revisa los campos e inténtalo de nuevo.");
        }
      } else if (code === "23505" && isDniUnique) {
        setDniError("Este DNI ya está registrado en otro perfil.");
      } else if (code === "42703" || msg.includes("column")) {
        setErrorMsg("Falta alguna columna en la tabla de perfiles o el tipo no coincide. Revisa el esquema (areas_interes, rol, unidad…).");
      } else {
        setErrorMsg(error.message || "Hubo un error al guardar los datos. Inténtalo de nuevo.");
      }
      return;
    }

    setErrorMsg("");
    setOkMsg("Guardado correctamente ✔");
    setTimeout(() => navigate("/dashboard"), 600);
  }

  function toggleArea(area) {
    setAreasInteres((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-600">Cargando perfil…</div>
      </div>
    );
  }

  if (!session) return null;

  const heroStats = [
    {
      key: "estado",
      label: "Estado",
      value: statusInfo.approved ? "Aprobado" : "Pendiente",
      helper: statusInfo.approvedAt ? `Desde ${formatDateShort(statusInfo.approvedAt)}` : "Esperando revisión",
    },
    {
      key: "verificacion",
      label: "Verificación",
      value: statusInfo.verified ? "Email verificado" : "Sin verificar",
      helper: statusInfo.verifiedAt ? `Verificado ${formatDateShort(statusInfo.verifiedAt)}` : "Confirma tu email si aún no lo hiciste",
    },
    {
      key: "rol",
      label: "Rol profesional",
      value: formatRoleLabel(rol),
      helper: unidad ? `Unidad: ${unidad}` : "Selecciona tu unidad",
    },
  ];

  const heroClasses = {
    grid: "grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm",
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar isPrivate />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A3D91] via-[#1E6ACB] to-[#4FA3E3]" />
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_15%_15%,rgba(255,255,255,0.18),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.12),transparent_45%)]" />
        <div className="max-w-5xl mx-auto px-5 py-12 text-white relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <p className="text-white/70 text-sm uppercase tracking-wide">Perfil profesional</p>
              <h1 className="text-3xl md:text-4xl font-semibold">Hola, {nombre || session.user?.email}</h1>
              <p className="opacity-95 max-w-2xl text-lg">
                Completa tu información para personalizar escenarios, checklist y notificaciones.
              </p>
            </div>
            <div className={heroClasses.grid}>
              {heroStats.map((item) => (
                <HeroStat key={item.key} icon={null} label={item.label} value={item.value} helper={item.helper} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {(errorMsg || okMsg) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              errorMsg
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-emerald-50 border-emerald-200 text-emerald-700"
            }`}
          >
            {errorMsg || okMsg}
          </div>
        )}

        {showSetPassword && (
          <form onSubmit={handleUpdatePassword} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Establecer nueva contraseña</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-700">Nueva contraseña</span>
                <input type="password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} placeholder="••••••••" required />
              </label>
              <label className="block">
                <span className="text-sm text-slate-700">Confirmar contraseña</span>
                <input type="password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]" value={newPassword2} onChange={(e)=>setNewPassword2(e.target.value)} placeholder="••••••••" required />
              </label>
            </div>
            {pwMsg && (
              <div className={`mt-3 rounded border px-3 py-2 text-sm ${pwMsg.includes('✔') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{pwMsg}</div>
            )}
            <div className="mt-4">
              <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-sky-700 text-white px-4 py-2 hover:bg-sky-800">Guardar contraseña</button>
            </div>
          </form>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.35)] px-6 py-6 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <TrophyIcon className="h-5 w-5" />
                </span>
                Logros conquistados
              </h2>
              <p className="text-sm text-slate-600">Repaso de los badges que has desbloqueado en SimuPed.</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/certificado"
                className="inline-block px-3 py-2 rounded bg-slate-100 text-slate-700 text-sm border"
              >Ver certificado</a>
              <a
                href="/certificado?prueba=1"
                className="inline-block px-3 py-2 rounded bg-white text-slate-600 text-sm border border-dashed"
              >Descargar prueba</a>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                En pruebas · pendiente optimizar PDF
              </span>
            </div>
            <span className="text-sm text-slate-500">
              {loadingAchievements ? "Cargando logros…" : `${achievements.length} logro${achievements.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {loadingAchievements ? (
            <div className="text-sm text-slate-500">Estamos recuperando tus logros.</div>
          ) : achievements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              Aún no has desbloqueado logros. Completa simulaciones para conseguir tu primer badge.
            </div>
          ) : (
            <ul className="space-y-3">
              {achievements.map((badge) => {
                const categoryLabel = BADGE_CATEGORIES[badge.category]?.label || "Logro";
                const dateLabel = badge.earnedDate ? formatDateShort(badge.earnedDate) : "Sin fecha";
                return (
                  <li
                    key={`${badge.badgeId}-${badge.earnedDate || "na"}`}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className={`mt-0.5 h-10 w-10 shrink-0 rounded-xl grid place-items-center text-base ${badge.colorClass}`}>
                      <span>{badge.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{badge.title}</h3>
                        <span className="text-xs text-slate-500">Conseguido {dateLabel}</span>
                      </div>
                      {badge.description ? (
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{badge.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-700">
                          {categoryLabel}
                        </span>
                        {badge.type ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5">
                            {badge.type}
                          </span>
                        ) : null}
                        {badge.earnedFor ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-slate-500">
                            {badge.earnedFor}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <form
          onSubmit={handleGuardar}
          className="rounded-3xl border border-slate-200 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.35)] px-6 py-7 space-y-8"
        >
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Datos personales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-700">Nombre</span>
                <input
                  id="campo-nombre"
                  type="text"
                  autoComplete="given-name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre"
              />
              </label>

              <label className="block">
                <span className="text-sm text-slate-700">Apellidos</span>
                <input
                  id="campo-apellidos"
                  type="text"
                  autoComplete="family-name"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  placeholder="Apellidos"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm text-slate-700">Email</span>
                <input
                  id="campo-email"
                  type="email"
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
                <p className="text-xs text-slate-500 mt-1">
                  Al cambiar el email puede requerirse verificación por correo.
                </p>
              </label>

              <label className="block">
                <span className="text-sm text-slate-700">DNI</span>
                <input
                  id="campo-dni"
                  type="text"
                  autoComplete="off"
                  inputMode="text"
                  maxLength={10}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  value={dni}
                  onChange={(e) => {
                    setDni(e.target.value.toUpperCase());
                    if (dniError) setDniError("");
                  }}
                  placeholder="12345678A"
                />
                {dniError && (
                  <p className="text-xs text-red-600 mt-1">{dniError}</p>
                )}
              </label>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Rol y unidad</h2>
            <div>
              <span className="block text-sm text-slate-700 mb-2">Rol</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "medico", label: "Médico" },
                  { value: "enfermeria", label: "Enfermería" },
                  { value: "farmacia", label: "Farmacia" },
                ].map((r) => {
                const active = rol === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    id={`rol-${r.value}`}
                    onClick={() => setRol(r.value)}
                    className={`px-4 py-2 rounded-lg border transition ${
                      active
                        ? "border-transparent text-white"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                    style={active ? { backgroundColor: COLORS.primary } : {}}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            </div>

            <div>
              <span className="block text-sm text-slate-700 mb-2">Unidad</span>
              <div className="flex flex-wrap gap-3">
              {UNIDADES.map((u) => (
                <label
                  key={u}
                  htmlFor={`unidad-${u}`}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    unidad === u
                      ? "border-transparent text-white"
                      : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                  }`}
                  style={unidad === u ? { backgroundColor: COLORS.primary } : {}}
                >
                  <input
                    id={`unidad-${u}`}
                    type="radio"
                    name="unidad"
                    value={u}
                    checked={unidad === u}
                    onChange={(e) => setUnidad(e.target.value)}
                    className="sr-only"
                  />
                  <span>{u}</span>
                </label>
              ))}
            </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Áreas de interés</h2>
              <span className="text-xs text-slate-500">Selecciona las que mejor describan tu práctica habitual</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {categorias.map((cat) => {
                const checked = areasInteres.includes(cat.name);
                return (
                  <label
                    key={cat.id}
                    htmlFor={`area-${cat.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${
                      checked
                        ? "border-transparent text-white"
                        : "border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
                    }`}
                    style={checked ? { backgroundColor: COLORS.primary } : {}}
                  >
                    <input
                      id={`area-${cat.id}`}
                      type="checkbox"
                      value={cat.name}
                      checked={checked}
                      onChange={() => toggleArea(cat.name)}
                      className="sr-only"
                    />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                );
              })}
              {categorias.length === 0 && (
                <div className="text-slate-500 text-sm col-span-full">
                  No hay categorías disponibles.
                </div>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-white disabled:opacity-70"
              style={{ backgroundColor: COLORS.primary }}
            >
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
