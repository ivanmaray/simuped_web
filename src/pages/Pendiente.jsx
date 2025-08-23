// src/pages/Pendiente.jsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar.jsx';

export default function Pendiente() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    setError('');
    try {
      // 1) Sesión y usuario
      const { data: sessData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;

      const session = sessData?.session || null;
      if (!session) {
        // Sin sesión → a inicio
        navigate('/', { replace: true });
        return;
      }

      // getUser() para saber si el email está verificado (email_confirmed_at)
      const { data: uData, error: uErr } = await supabase.auth.getUser();
      if (uErr) throw uErr;

      const user = uData?.user;
      if (!user) {
        navigate('/', { replace: true });
        return;
      }

      const verified = Boolean(user.email_confirmed_at);
      setEmailVerified(verified);

      // 2) Perfil aprobado en nuestra tabla
      const uid = user.id;
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('approved')
        .eq('id', uid)
        .maybeSingle();

      if (pErr) {
        setError('No se pudo comprobar el estado de tu cuenta.');
        setApproved(false);
      } else {
        setApproved(Boolean(prof?.approved));
      }

      // 3) Si ya está todo OK → al dashboard
      if (verified && prof?.approved) {
        navigate('/dashboard', { replace: true });
      }
    } catch (e) {
      console.error('[Pendiente] error:', e);
      setError('No se pudo comprobar el estado de tu cuenta.');
    } finally {
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkStatus(); // primera comprobación al montar

    // Re-comprobar cada 15s por si se verifica el email o el admin aprueba
    const int = setInterval(() => {
      checkStatus();
    }, 15000);

    return () => clearInterval(int);
  }, [checkStatus]);

  async function handleLogout() {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      console.warn('[Pendiente] signOut warning:', e);
    } finally {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
      navigate('/', { replace: true });
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      const { data: uData } = await supabase.auth.getUser();
      const email = uData?.user?.email;
      if (!email) throw new Error('Sin email de usuario');

      // Supabase v2: reenviar correo de verificación
      const { error: rErr } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      if (rErr) throw rErr;
    } catch (e) {
      console.error('[Pendiente] resend error:', e);
      setError('No se pudo reenviar el email de verificación.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Navbar pública (azul) */}
      <Navbar variant="public" />

      <main className="max-w-2xl mx-auto px-5 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Cuenta pendiente de aprobación</h1>
          <p className="mt-2 text-slate-700">
            Hemos recibido tu solicitud. Un administrador revisará tu cuenta.
          </p>

          <div className="mt-6 space-y-2">
            <EstadoRow
              label="Verificación de email"
              ok={emailVerified}
              loading={checking}
              okText="Verificado ✅"
              koText="❌ No verificado"
            />
            <EstadoRow
              label="Aprobación de administrador"
              ok={approved}
              loading={checking}
              okText="✅ Aprobado"
              koText="⏳ Pendiente"
            />
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {/* Botón de comprobar ahora (útil si el admin aprueba mientras el usuario espera) */}
            <button
              type="button"
              onClick={checkStatus}
              disabled={checking}
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60"
            >
              {checking ? 'Comprobando…' : 'Comprobar ahora'}
            </button>

            {/* Reenviar verificación si aún no está verificado */}
            {!emailVerified && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                {resending ? 'Enviando…' : 'Reenviar verificación'}
              </button>
            )}

            {/* Cerrar sesión → vuelve a la portada */}
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:opacity-90"
            >
              Cerrar sesión
            </button>

            {/* Enlace informativo al inicio */}
            <Link
              to="/"
              className="ml-auto text-slate-600 hover:underline"
              title="Volver al inicio"
            >
              Volver al inicio
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Esta página comprueba tu estado automáticamente cada 15 segundos.
          </p>
        </div>
      </main>
    </div>
  );
}

function EstadoRow({ label, ok, loading, okText, koText }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-slate-700">{label}:</span>
      <span className="font-medium">
        {loading ? '…' : ok ? okText : koText}
      </span>
    </div>
  );
}