// src/pages/Pendiente.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from '../components/Navbar.jsx';

export default function Pendiente() {
  const { ready, session, emailConfirmed, approved } = useAuth();
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      navigate('/', { replace: true });
      return;
    }
    if (emailConfirmed && approved) {
      navigate('/dashboard', { replace: true });
    }
  }, [ready, session, emailConfirmed, approved, navigate]);

  async function checkNow() {
    if (!session) return;
    setChecking(true);
    const { data } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', session.user.id)
      .maybeSingle();
    setChecking(false);
    if (data?.approved) navigate('/dashboard', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-semibold mb-2">Cuenta pendiente de aprobación</h1>
        <p className="text-slate-700">Hemos recibido tu solicitud. Un administrador revisará tu cuenta.</p>

        <div className="mt-6 space-y-2 text-sm">
          <p>Verificación de email: {emailConfirmed ? '✅ Verificado' : '❌ No verificado'}</p>
          <p>Aprobación de administrador: {approved ? '✅ Aprobado' : '⏳ Pendiente'}</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={checkNow}
            disabled={checking}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50"
          >
            {checking ? 'Comprobando…' : 'Comprobar ahora'}
          </button>
          <button
            onClick={() => supabase.auth.signOut().then(() => navigate('/', { replace: true }))}
            className="px-4 py-2 rounded-lg border"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}