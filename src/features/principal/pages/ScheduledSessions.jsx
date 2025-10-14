import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../auth";
import Navbar from "../../../components/Navbar.jsx";

const ScheduledSessions = () => {
  const navigate = useNavigate();
  const { ready, session, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSetupInfo, setShowSetupInfo] = useState(false);

  useEffect(() => {
    if (!ready || !session) return;

    fetchSessions();
  }, [ready, session]);

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
        // Get scheduled sessions with participant counts
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

        // Get participant counts for each session
        const sessionsWithCounts = await Promise.all(
          (data || []).map(async (session) => {
            try {
              const { count } = await supabase
                .from("scheduled_session_participants")
                .select("id", { count: "exact" })
                .eq("session_id", session.id);

              // Get the current user ID from the auth context
              const userId = (
                typeof session === 'object' && session.stream && session.stream.user
                  ? session.stream.user.id
                  : session?.user?.id || null
              );

              // Check if user is already registered
              const { data: registration } = await supabase
                .from("scheduled_session_participants")
                .select("id")
                .eq("session_id", session.id)
                .eq("user_id", userId)
                .single();

              return {
                ...session,
                registered_count: count || 0,
                is_registered: !!registration,
                scheduled_at: new Date(session.scheduled_at)
              };
            } catch (err) {
              console.warn("Error getting participants for session:", err);
              return {
                ...session,
                registered_count: 0,
                is_registered: false,
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

      const { error } = await supabase
        .from("scheduled_session_participants")
        .insert({
          session_id: sessionId,
          user_id: session.user.id,
          registered_at: new Date().toISOString()
        });

      if (error) {
        // Handle duplicate key error specifically
        if (error.code === '23505') {
          alert("Ya estás registrado en esta sesión");
          // Reload to ensure UI is up to date
          await fetchSessions();
          return;
        }
        throw error;
      }

      // Reload sessions to update counts
      await fetchSessions();
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

  const createNewSession = () => {
    navigate("/sesiones-programadas/crear");
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
                      </div>
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
                  </div>
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
