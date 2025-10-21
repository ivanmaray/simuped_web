import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";
import InviteResultModal from "../../../components/InviteResultModal.jsx";

const CreateScheduledSession = () => {
  const navigate = useNavigate();
  const { ready, session, isAdmin } = useAuth();
  const [scenarios, setScenarios] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    location: "Sala de Simulación HUCA",
    max_participants: 8,
    mode: "clasico",
    scenario_id: "",
    enrollment_deadline: "",
    participants: [] // Array de objetos {user_id, user_name, user_email, user_role}
  });

  // Temp input for adding invitations
  const [inviteInput, setInviteInput] = useState({ name: '', email: '', role: '' });

  const [availableRoles] = useState([
    { value: 'medico', label: 'Médico', color: 'bg-blue-500' },
    { value: 'enfermeria', label: 'Enfermería', color: 'bg-green-500' },
    { value: 'farmacia', label: 'Farmacia', color: 'bg-purple-500' },
    { value: 'otro', label: 'Otro', color: 'bg-gray-500' }
  ]);
  const [inviteResults, setInviteResults] = useState([]);
  const [showInviteResults, setShowInviteResults] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;
    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    fetchScenarios();
  }, [ready, session, isAdmin, navigate]);

  const fetchScenarios = async () => {
    try {
      setLoadingScenarios(true);
      const { data, error } = await supabase
        .from("scenarios")
        .select("id, title, summary, level, mode, estimated_minutes")
        .order("title", { ascending: true });

      if (error) throw error;
      setScenarios(data || []);
    } catch (err) {
      console.error("Error fetching scenarios:", err);
    } finally {
      setLoadingScenarios(false);
    }
  };

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

      // If there are participants to invite, send them in a single request to the backend
      let inviteResults = [];
      if (Array.isArray(form.participants) && form.participants.length > 0) {
        try {
          const invites = form.participants.map((p) => ({ email: p.user_email || p.email || p.userEmail || p.email_address, name: p.user_name || p.name || '', role: p.user_role || p.role || '' }));
          const resp = await fetch('/api/send_session_invites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: data.id, invites, inviter_id: session.user_id })
          });
          if (resp.ok) {
            const json = await resp.json();
            inviteResults = (json.results || []).map(r => ({ email: r.email || '', ok: !!r.ok, message: r.error || (r.resp || '') }));
          } else {
            const text = await resp.text().catch(() => 'Error desconocido');
            inviteResults = [{ email: 'N/A', ok: false, message: text }];
          }
        } catch (e) {
          console.warn('Error sending invites batch', e);
          inviteResults = [{ email: 'N/A', ok: false, message: e.message }];
        }
      }

      // Show invite results modal if we attempted invites
      if (inviteResults.length > 0) {
        setInviteResults(inviteResults);
        setShowInviteResults(true);
        // Wait for the modal to be closed by the user; the modal will call onClose which will set showInviteResults=false and then we navigate
        return;
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
                <option value="clasico">Clásico (1 pantalla)</option>
                <option value="dual">Dual (2 pantallas)</option>
              </select>
            </label>
          </div>

          {/* Invitaciones por correo */}
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Invitar participantes (opcional)</h3>
            <p className="text-sm text-slate-500 mb-3">Puedes añadir direcciones de correo para que reciban una invitación automática.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <label className="block">
                <span className="text-xs text-slate-600 block">Nombre</span>
                <input
                  type="text"
                  value={inviteInput.name}
                  onChange={(e) => setInviteInput((s) => ({ ...s, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2"
                  placeholder="Nombre completo (opcional)"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600 block">Correo electrónico</span>
                <input
                  type="email"
                  value={inviteInput.email}
                  onChange={(e) => setInviteInput((s) => ({ ...s, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2"
                  placeholder="ejemplo@hospital.es"
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-600 block">Rol</span>
                <select
                  value={inviteInput.role}
                  onChange={(e) => setInviteInput((s) => ({ ...s, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2"
                >
                  <option value="">Seleccionar rol (opcional)</option>
                  {availableRoles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!inviteInput.email || inviteInput.email.trim() === '') {
                    alert('Introduce un correo válido para invitar');
                    return;
                  }
                  setForm((prev) => ({ ...prev, participants: (prev.participants || []).concat({ user_name: inviteInput.name, user_email: inviteInput.email, user_role: inviteInput.role }) }));
                  setInviteInput({ name: '', email: '', role: '' });
                }}
                className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700"
              >
                Añadir invitado
              </button>
              <div className="text-sm text-slate-500 self-center">{form.participants.length} invitado(s) añadidos</div>
            </div>

            {form.participants.length > 0 && (
              <ul className="mt-4 space-y-2">
                {form.participants.map((p, idx) => (
                  <li key={`${p.user_email}-${idx}`} className="flex items-center justify-between gap-3 rounded-lg border p-2">
                    <div>
                      <div className="text-sm font-medium">{p.user_name || p.user_email}</div>
                      <div className="text-xs text-slate-500">{p.user_email} {p.user_role ? `· ${p.user_role}` : ''}</div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, participants: prev.participants.filter((_, i) => i !== idx) }))}
                        className="px-2 py-1 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                      >Eliminar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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

      <InviteResultModal isOpen={showInviteResults} results={inviteResults} onClose={() => {
        setShowInviteResults(false);
        // after closing, navigate to sessions list
        navigate('/sesiones-programadas');
      }} />
    </div>
  );
};

export default CreateScheduledSession;
