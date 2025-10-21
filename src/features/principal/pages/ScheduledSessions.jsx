import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";

const ScheduledSessions = () => {
  const navigate = useNavigate();
  const { ready, session: authSession, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSetupInfo, setShowSetupInfo] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!ready) return;

    fetchSessions();
  }, [ready]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError("");

      // Verify tables exist by checking known table
      let tableExists = true;
      try {
        const { error } = await supabase.from("scheduled_sessions").select("id").limit(1);
        if (error) {
          // Any error likely means table doesn't exist
          tableExists = false;
          console.warn("scheduled_sessions table doesn't exist yet");
        }
      } catch (err) {
        tableExists = false;
        console.warn("Error checking table existence:", err);
      }

      if (!tableExists) {
        // Show setup error - tables need to be created
        setSessions([]);
        setError("Las tablas de sesiones programadas no están creadas. Ejecuta las migraciones SQL primero.");
      } else {
        // Get scheduled sessions
        const { data, error } = await supabase
          .from("scheduled_sessions")
          .select(`
            id,
            title,
            description,
            scheduled_at,
            location,
            max_participants,
            mode,
            scenario_id,
            is_active,
            enrollment_deadline,
            scenarios:scenario_id(title)
          `)
          .eq("is_active", true)
          .gt("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true });

        if (error) throw error;

        const sessionIds = (data || []).map((session) => session.id);
        let countsBySession = {};

        if (sessionIds.length > 0) {
          try {
            const response = await fetch('/api/scheduled_session_counts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionIds })
            });

            if (response.ok) {
              const json = await response.json();
              countsBySession = json?.counts || {};
            } else {
              console.warn('Failed to load session counts', response.status);
            }
          } catch (countErr) {
            console.warn('Error fetching session counts', countErr);
          }
        }

        // Combine session info with counts and user registration state
        const sessionsWithCounts = await Promise.all(
          (data || []).map(async (session) => {
            try {
              // Check individual registration status only for authenticated users
              let isRegistered = false;
              let userRegistration = null;
              if (ready && authSession && authSession.user && authSession.user.id) {
                try {
                  const { data: registration } = await supabase
                    .from("scheduled_session_participants")
                    .select("id, registered_at, confirmed_at")
                    .eq("session_id", session.id)
                    .eq("user_id", authSession.user.id)
                    .maybeSingle();
                  if (registration) {
                    isRegistered = true;
                    userRegistration = registration;
                  }
                } catch (regError) {
                  // Not registered, that's fine
                }
              }

              const countInfo = countsBySession[session.id] || { total: 0, confirmed: 0 };

              return {
                ...session,
                registered_count: typeof countInfo.total === 'number' ? countInfo.total : 0,
                is_registered: isRegistered,
                user_registration: userRegistration,
                confirmed_count: typeof countInfo.confirmed === 'number' ? countInfo.confirmed : null,
                scheduled_at: new Date(session.scheduled_at)
              };
            } catch (err) {
              console.warn("Error building session entry:", err);
              return {
                ...session,
                registered_count: 0,
                is_registered: false,
                confirmed_count: null,
                scheduled_at: new Date(session.scheduled_at)
              };
            }
          })
        );

        setSessions(sessionsWithCounts);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Las tablas de sesiones programadas no están creadas. Ejecuta las migraciones SQL primero.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const registerForSession = async (sessionId) => {
    try {
      // Check if user is already registered (double-check before insert)
      const sessionData = sessions.find(s => s.id === sessionId);
      if (sessionData?.is_registered) {
        alert("Ya estás registrado en esta sesión");
        return;
      }

      // Try to update an existing invited row (set confirmed_at) first
      // If none exists, insert a new row with confirmed_at = now()
      const now = new Date().toISOString();
      // Attempt to update an existing invited row and get updated rows
      const { data: updatedRows, error: updateErr } = await supabase
        .from("scheduled_session_participants")
        .update({ confirmed_at: now })
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', authSession.user.id);

      let finalError = updateErr;
      // If update succeeded but no rows were updated, insert a new confirmed row
      if (!updateErr && (!updatedRows || updatedRows.length === 0)) {
        const { error: insErr } = await supabase
          .from("scheduled_session_participants")
          .insert({
            session_id: sessionId,
            user_id: authSession.user.id,
            registered_at: now,
            confirmed_at: now
          });
        finalError = insErr;
      }

      if (finalError) {
        // Handle duplicate key error specifically
        if (finalError.code === '23505') {
          alert("Ya estás registrado en esta sesión");
          // Reload to ensure UI is up to date
          await fetchSessions();
          return;
        }
        throw finalError;
      }

      // Reload sessions to update counts
      await fetchSessions();

      // Send notification emails
      try {
        const userProfile = await supabase
          .from("profiles")
          .select("email, nombre, apellidos")
          .eq("id", authSession.user.id)
          .single();

        if (userProfile.data) {
          const userEmail = userProfile.data.email;
          const userName = [userProfile.data.nombre, userProfile.data.apellidos]
            .filter(Boolean)
            .join(" ") || "Usuario";

          await fetch("/api/notify_session_registration", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userEmail,
              userName,
              sessionName: sessionData.title,
              sessionDate: sessionData.scheduled_at.toISOString(),
              sessionLocation: sessionData.location,
              sessionCode: sessionData.id.substring(0, 6).toUpperCase() // Use first 6 chars as code
            })
          });
        }
      } catch (emailError) {
        console.warn("Email notification failed:", emailError);
        // Don't fail the registration if email fails
      }

      alert("¡Registro completado! Te has apuntado a la sesión.");
    } catch (err) {
      console.error("Error registering for session:", err);

      // Show specific error for already registered
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        alert("Ya estás registrado en esta sesión");
        await fetchSessions();
      } else {
        alert("Error al registrar. Inténtalo de nuevo.");
      }
    }
  };

  const unregisterFromSession = async (sessionId) => {
    if (!confirm("¿Estás seguro de que quieres desapuntarte de esta sesión?")) {
      return;
    }

    try {
      const sessionData = sessions.find(s => s.id === sessionId);
      if (!sessionData?.is_registered) {
        alert("No estás registrado en esta sesión");
        return;
      }

      const { error } = await supabase
        .from("scheduled_session_participants")
        .delete()
        .eq("session_id", sessionId)
        .eq("user_id", authSession.user.id);

      if (error) throw error;

      // Reload to update UI
      await fetchSessions();

      alert("Te has desapuntado de la sesión.");
    } catch (err) {
      console.error("Error unregistering from session:", err);
      alert("Error al desapuntarte. Inténtalo de nuevo.");
    }
  };

  const createNewSession = () => {
    navigate("/sesiones-programadas/crear");
  };

  const deleteSession = async (sessionId, title) => {
    if (!isAdmin) return;
    const ok = confirm(`¿Eliminar la sesión "${title}"? Se eliminarán también los registros de asistentes.`);
    if (!ok) return;

    try {
      setDeletingId(sessionId);
      await supabase
        .from("scheduled_session_participants")
        .delete()
        .eq("session_id", sessionId);

      const { error: deleteErr } = await supabase
        .from("scheduled_sessions")
        .delete()
        .eq("id", sessionId);
      if (deleteErr) throw deleteErr;

      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      alert("Sesión eliminada correctamente.");
    } catch (err) {
      console.error("Error deleting session:", err);
      alert("No se pudo eliminar la sesión. Revisa los permisos o vuelve a intentarlo.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="max-w-6xl mx-auto px-5 py-8">
          <div className="text-center text-slate-600">Cargando sesiones programadas…</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-5 py-8">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Sesiones programadas
            </h1>
            {isAdmin && (
              <button
                onClick={createNewSession}
                className="px-4 py-2 bg-[#0A3D91] text-white rounded-lg hover:bg-[#0A3D91]/90 transition"
              >
                Crear sesión
              </button>
            )}
          </div>
          <p className="text-slate-600">
            Únete a las próximas sesiones de simulación presencial o registra nuevas sesiones como instructor.
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800">
            {error}
            <div className="mt-4 text-sm">
              <button
                onClick={() => setShowSetupInfo(!showSetupInfo)}
                className="underline text-red-600 hover:text-red-800"
              >
                {showSetupInfo ? 'Ocultar ' : 'Mostrar '}instrucciones de configuración
              </button>
              {showSetupInfo && (
                <div className="mt-3 p-3 bg-red-100 rounded text-red-800">
                  <p className="font-medium mb-2">Para habilitar las sesiones programadas:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Ve a Supabase Dashboard → SQL Editor</li>
                    <li>Ejecuta las instrucciones del archivo <code>part1.sql</code></li>
                    <li>Después las del archivo <code>part2.sql</code></li>
                    <li>Finalmente las del archivo <code>part3.sql</code></li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">


          {sessions.length > 0 ? (
            sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <header className="mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-slate-900 mb-2">
                        {session.title}
                      </h2>
                      <p className="text-slate-600 mb-3">
                        {session.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {session.scheduled_at.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {session.location}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197z" />
                          </svg>
                          {session.registered_count}/{session.max_participants} participantes
                        </span>
                        {isAdmin && typeof session.confirmed_count === 'number' && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {session.confirmed_count} confirmados
                          </span>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                            </svg>
                            {session.registered_count} inscritos
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {session.confirmed_count ?? 0} confirmados
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.mode === 'dual'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {session.mode === 'dual' ? 'Dual' : 'Clásico'}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => deleteSession(session.id, session.title)}
                            disabled={deletingId === session.id}
                            className="px-2 py-1 rounded border border-red-200 text-red-600 text-xs hover:bg-red-50 disabled:opacity-60"
                            title="Eliminar sesión"
                          >
                            {deletingId === session.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </header>

                <footer className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                      {session.registered_count < session.max_participants
                        ? `${session.max_participants - session.registered_count} plazas disponibles`
                        : 'Completa'
                      }
                    </span>
                    {session.user_registration && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                          session.user_registration.confirmed_at
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {session.user_registration.confirmed_at
                          ? `Asistencia confirmada · ${new Date(session.user_registration.confirmed_at).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}`
                          : 'Registro pendiente de confirmación'}
                      </span>
                    )}
                  </div>

                  {session.is_registered ? (
                    <button
                      onClick={() => unregisterFromSession(session.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Desapuntarme
                    </button>
                  ) : (
                    <button
                      onClick={() => registerForSession(session.id)}
                      disabled={session.registered_count >= session.max_participants}
                      className="px-4 py-2 bg-[#0A3D91] text-white rounded-lg hover:bg-[#0A3D91]/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {session.registered_count >= session.max_participants
                        ? 'Completa'
                        : 'Apuntarme'
                      }
                    </button>
                  )}
                </footer>
              </article>
            ))
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No hay sesiones programadas
              </h3>
              <p className="text-slate-600">
                Las próximas sesiones aparecerán aquí cuando sean anunciadas.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ScheduledSessions;
