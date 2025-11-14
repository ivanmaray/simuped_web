import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";
import { isColumnMissing, shouldRetryWithoutIdx } from "../../../utils/supabaseHelpers.js";
// Invite-by-email feature removed: no external invitations will be sent

const CreateScheduledSession = () => {
  const navigate = useNavigate();
  const { ready, session, isAdmin } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    location: "Sala de Simulación HUCA",
    max_participants: 8,
    mode: "clásico",
    scenario_id: "",
    enrollment_deadline: "",
    participants: [] // Array de objetos {user_id, user_name, user_email, user_role}
  });

  const [availableRoles] = useState([
    { value: 'medico', label: 'Médico', color: 'bg-blue-500' },
    { value: 'enfermeria', label: 'Enfermería', color: 'bg-green-500' },
    { value: 'farmacia', label: 'Farmacia', color: 'bg-purple-500' },
    { value: 'otro', label: 'Otro', color: 'bg-gray-500' }
  ]);
  // inviteResults and showInviteResults removed since external invites are disabled

  // Para selección de participantes como en Presencial_Confirm
  const [roleToAdd, setRoleToAdd] = useState('medico');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!ready || !session) return;
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    fetchScenarios();
    fetchUsers();
  }, [ready, session, isAdmin, navigate]);

  const fetchScenarios = async () => {
    try {
      setLoadingScenarios(true);
      let data = null;
      let error = null;

      const fetchWithIdx = () =>
        supabase
          .from("scenarios")
          .select("id, idx, title, summary, level, mode, estimated_minutes")
          .order("idx", { ascending: true, nullsFirst: true })
          .order("title", { ascending: true });

      const fetchWithoutIdx = () =>
        supabase
          .from("scenarios")
          .select("id, title, summary, level, mode, estimated_minutes")
          .order("title", { ascending: true });

      const skipIdx = isColumnMissing("scenarios", "idx");
      if (!skipIdx) {
        ({ data, error } = await fetchWithIdx());

        if (error && shouldRetryWithoutIdx(error)) {
          console.warn("[CreateScheduledSession] idx column missing, retrying without idx", error);
          const fallback = await fetchWithoutIdx();
          data = fallback.data;
          error = fallback.error;
        }
      } else {
        ({ data, error } = await fetchWithoutIdx());
      }

      if (error) throw error;
      const getOrderIndex = (row) => {
        const value = Number(row?.idx);
        return Number.isFinite(value) ? value : null;
      };
      const sorted = (data || []).slice().sort((a, b) => {
        const ai = getOrderIndex(a);
        const bi = getOrderIndex(b);
        if (ai != null || bi != null) {
          if (ai != null && bi != null && ai !== bi) return ai - bi;
          if (ai != null && bi == null) return -1;
          if (ai == null && bi != null) return 1;
        }
        const ta = (a.title || "").toLocaleLowerCase("es");
        const tb = (b.title || "").toLocaleLowerCase("es");
        return ta.localeCompare(tb, "es");
      });
      setScenarios(sorted);
    } catch (err) {
      console.error("Error fetching scenarios:", err);
    } finally {
      setLoadingScenarios(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre, apellidos, email, rol")
        .eq("approved", true)
        .order("nombre", { ascending: true });

      if (error) throw error;
      // Crear full_name y role, y normalizar
      const processedUsers = (data || []).map(u => ({
        id: u.id,
        full_name: [u.nombre, u.apellidos].filter(Boolean).join(" "),
        email: u.email,
        role: normalizeRole(u.rol),
        rol: u.rol // mantener original
      }));
      setUsers(processedUsers);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Normaliza textos de rol a valores canónicos sin tildes
  function normalizeRole(txt) {
    const s = String(txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (!s) return '';
    if (s.includes('medic')) return 'medico';          // medico, médica, médico
    if (s.includes('enfer')) return 'enfermeria';      // enfermera, enfermería
    if (s.includes('farm')) return 'farmacia';         // farmacia, farmacéutic-
    if (s.includes('instr') || s.includes('tutor') || s.includes('docent')) return 'instructor';
    return 'otro';
  }

  function usersForRole(role) {
    const r = normalizeRole(role);
    return users.filter(u => u.role === r);
  }

  function addParticipantFromSearch() {
    if (!searchText.trim()) return;
    const pool = usersForRole(roleToAdd);
    const found = pool.find(u => (u.full_name || '').toLowerCase() === searchText.toLowerCase());
    if (found) {
      // Usuario existente
      setForm(prev => ({
        ...prev,
        participants: [...prev.participants, {
          user_id: found.id,
          user_name: found.full_name,
          user_email: found.email,
          user_role: found.role
        }]
      }));
    } else {
      // Nombre manual - añadir como invitación
      setForm(prev => ({
        ...prev,
        participants: [...prev.participants, {
          user_name: searchText.trim(),
          user_email: '',
          user_role: roleToAdd
        }]
      }));
    }
    setSearchText('');
  }

  const handleChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);

      // Validate required fields
      if (!form.title.trim()) throw new Error("El título es obligatorio");
      if (!form.scheduled_at) throw new Error("La fecha y hora son obligatorias");
      if (!form.scenario_id) throw new Error("Debes seleccionar un escenario");

      // Insert the scheduled session
      const { data, error } = await supabase
        .from("scheduled_sessions")
        .insert({
          title: form.title.trim(),
          description: form.description.trim(),
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          location: form.location.trim(),
          max_participants: parseInt(form.max_participants),
          mode: form.mode,
          scenario_id: parseInt(form.scenario_id),
          created_by: session.user_id,
          is_active: true,
          enrollment_deadline: form.enrollment_deadline
            ? new Date(form.enrollment_deadline).toISOString()
            : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Invite registered users (those with user_id) via server endpoint
      try {
        const registeredUserIds = (form.participants || []).filter(p => p.user_id).map(p => p.user_id);
        if (registeredUserIds.length > 0) {
          // Send individual invites for each registered user
          const invitePromises = registeredUserIds.map(async (userId) => {
            try {
              const resp = await fetch('/api/session_invites?action=resend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  session_id: data.id,
                  user_id: userId,
                  session_name: form.title,
                  session_date: form.scheduled_at,
                  session_location: form.location
                })
              });
              let payload = null;
              try { payload = await resp.json(); } catch {}
              const ok = payload?.ok === true;
              return { userId, ok, status: resp.status, detail: payload?.detail, error: payload?.error };
            } catch (e) {
              return { userId, ok: false, error: e.message };
            }
          });

          const inviteResults = await Promise.all(invitePromises);
          const failed = inviteResults.filter(r => r.ok === false);
          if (failed.length > 0) {
            console.warn('Some invites failed', failed);
            const sample = failed[0];
            const extra = sample?.error || sample?.detail ? `\nDetalle: ${sample?.error || sample?.detail}` : '';
            alert(`Sesión creada, pero ${failed.length} invitación(es) falló/fallaron. Revisa la configuración de correo.${extra}`);
          }
        }
      } catch (e) {
        console.warn('Error inviting registered users:', e);
      }
      alert("Sesión programada creada exitosamente");
      navigate("/sesiones-programadas");

    } catch (err) {
      console.error("Error creating session:", err);
      alert(`Error al crear la sesión: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !session || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-6xl mx-auto px-5 py-8">
          <div className="text-center text-slate-600">
            {isAdmin === false ? "Acceso restringido" : "Cargando..."}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-5 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate("/sesiones-programadas")}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition"
              title="Volver"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Crear sesión programada
            </h1>
          </div>
          <p className="text-slate-600">
            Programa una nueva sesión de simulación para que los usuarios se puedan registrar.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6">
          {/* Título y descripción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block">
              <span className="text-sm text-slate-700 mb-1 block">Título de la sesión *</span>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                placeholder="Ej: Sesión Simulación Pediatría Crítica"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700 mb-1 block">Escenario base *</span>
              <select
                value={form.scenario_id}
                onChange={(e) => handleChange("scenario_id", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                required
              >
                <option value="">Seleccionar escenario...</option>
                {!loadingScenarios && scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title} ({scenario.estimated_minutes} min)
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Descripción */}
          <label className="block">
            <span className="text-sm text-slate-700 mb-1 block">Descripción (opcional)</span>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 h-20 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              placeholder="Describe brevemente el objetivo y contenido de la sesión..."
            />
          </label>

          {/* Fecha, hora y límite */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <label className="block">
              <span className="text-sm text-slate-700 mb-1 block">Fecha y hora programada *</span>
              <input
                type="datetime-local"
                required
                value={form.scheduled_at}
                onChange={(e) => handleChange("scheduled_at", e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700 mb-1 block">Límite de registro (opcional)</span>
              <input
                type="datetime-local"
                value={form.enrollment_deadline}
                onChange={(e) => handleChange("enrollment_deadline", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700 mb-1 block">Ubicación</span>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                placeholder="Sala de Simulación HUCA"
              />
            </label>
          </div>

          {/* Participantes y modo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block">
              <span className="text-sm text-slate-700 mb-1 block">Número máximo de participantes</span>
              <select
                value={form.max_participants}
                onChange={(e) => handleChange("max_participants", parseInt(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              >
                <option value={4}>4 participantes</option>
                <option value={6}>6 participantes</option>
                <option value={8}>8 participantes</option>
                <option value={10}>10 participantes</option>
                <option value={12}>12 participantes</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-slate-700 mb-1 block">Modo de simulación</span>
              <select
                value={form.mode}
                onChange={(e) => handleChange("mode", e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
              >
                <option value="clásico">Clásico (1 pantalla)</option>
                <option value="dual">Dual (2 pantallas)</option>
              </select>
            </label>
          </div>

          {/* Invitaciones por correo */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Seleccionar participantes</h3>
            <p className="text-sm text-slate-500 mb-3">Elige usuarios registrados o escribe nombres manualmente para invitar por correo.</p>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-4">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Selecciona el rol a añadir">
                {availableRoles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRoleToAdd(r.value)}
                    className={`px-3 py-1 rounded-full text-sm ring-1 transition ${
                      roleToAdd === r.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1">
                  <input
                    list={`users-${roleToAdd}`}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder={`Escribe un nombre o elige un usuario de ${availableRoles.find(r => r.value === roleToAdd)?.label.toLowerCase()}`}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1d99bf]"
                  />
                  <datalist id={`users-${roleToAdd}`}>
                    {usersForRole(roleToAdd).map((u) => (
                      <option key={u.id} value={u.full_name} />
                    ))}
                  </datalist>
                </div>
                <button
                  type="button"
                  onClick={addParticipantFromSearch}
                  className="px-3 py-2 rounded-lg font-semibold text-white bg-[#0A3D91] hover:bg-[#0A3D91]/90 transition"
                >
                  Añadir
                </button>
              </div>
            </div>

            {form.participants.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-slate-700">Participantes añadidos ({form.participants.length})</h4>
                {form.participants.map((p, idx) => (
                  <div key={`${p.user_email || p.user_name}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="text-sm font-medium">{p.user_name || p.user_email}</div>
                      <div className="text-xs text-slate-500">
                        {p.user_email && p.user_email !== p.user_name ? `${p.user_email} · ` : ''}
                        {availableRoles.find(r => r.value === p.user_role)?.label || p.user_role}
                        {p.user_id ? '' : ' (invitación pendiente)'}
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, participants: prev.participants.filter((_, i) => i !== idx) }))}
                        className="px-2 py-1 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      >Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

              {/* External-invite-by-email UI removed: we don't allow inviting external emails */}
          </div>
          {/* Botones */}
          <div className="flex items-center gap-3 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[#0A3D91] text-white rounded-lg font-medium hover:bg-[#0A3D91]/90 transition disabled:opacity-50"
            >
              {loading ? "Creando sesión…" : "Crear sesión programada"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/sesiones-programadas")}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </main>

      {/* InviteResultModal removed (external invites disabled) */}
    </div>
  );
};

export default CreateScheduledSession;
