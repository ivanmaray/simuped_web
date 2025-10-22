import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../../../components/Navbar.jsx';

export default function ConfirmInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Confirmando...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token ausente');
      return;
    }

    (async () => {
      try {
        const resp = await fetch('/api/session_invites?action=confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const json = await resp.json();
        if (resp.ok && json.ok) {
          setStatus('success');
          setMessage('Tu asistencia ha sido confirmada. ¡Nos vemos en la sesión!');
          setTimeout(() => navigate('/sesiones-programadas'), 2500);
        } else {
          setStatus('error');
          setMessage(json.error || 'Error al confirmar');
        }
      } catch (e) {
        setStatus('error');
        setMessage(e.message || 'Error red');
      }
    })();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-2xl mx-auto p-8">
        <div className="rounded-lg border bg-white p-6 text-center">
          {status === 'loading' && <div className="text-slate-600">{message}</div>}
          {status === 'success' && <div className="text-green-600 font-semibold">{message}</div>}
          {status === 'error' && <div className="text-red-600 font-semibold">{message}</div>}
        </div>
      </main>
    </div>
  );
}
