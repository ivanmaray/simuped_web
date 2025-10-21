import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../auth';
import Navbar from '../../../components/Navbar.jsx';

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return value;
  }
}

export default function Certificate() {
  const { ready, session, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!ready) return;
      if (!session?.user) {
        if (mounted) setMessage('Debes iniciar sesión para ver el certificado.');
        return;
      }

      // Load scenarios and user attempts
      try {
        const { data: scenarios } = await supabase.from('scenarios').select('id, title, mode');

        const { data: attempts } = await supabase
          .from('attempts')
          .select('scenario_id, started_at, finished_at, scenarios (mode)')
          .eq('user_id', session.user.id);

        const scenarioMap = new Map();
        (scenarios || []).forEach(s => scenarioMap.set(s.id, s));

        // Determine online scenarios list and presencial list
        const onlineScenarios = (scenarios || []).filter(s => {
          const m = s.mode || '';
          return Array.isArray(m) ? m.includes('online') : String(m).toLowerCase().includes('online');
        }).map(s => s.id);

        const presencialScenarios = (scenarios || []).filter(s => {
          const m = s.mode || '';
          return Array.isArray(m) ? m.includes('presencial') : String(m).toLowerCase().includes('presencial');
        }).map(s => s.id);

        // Build set of scenario_ids attempted by user per mode
        const attemptedByMode = { online: new Set(), presencial: new Set() };
        (attempts || []).forEach(a => {
          // if attempt includes mode inside joined scenarios
          const mode = a?.scenarios?.mode || null;
          const normalized = Array.isArray(mode) ? mode : mode ? [mode] : [];
          const scenId = a.scenario_id;
          (normalized || []).forEach(m => {
            const mm = String(m || '').toLowerCase();
            if (mm.includes('online')) attemptedByMode.online.add(scenId);
            if (mm.includes('presencial')) attemptedByMode.presencial.add(scenId);
          });
        });

        // Eligibility rule: ALL online scenarios attempted, and at least 25% of presencial attempted
        const onlineMissing = onlineScenarios.filter(id => !attemptedByMode.online.has(id));
        const presencialCount = presencialScenarios.length;
        const presencialDone = presencialScenarios.filter(id => attemptedByMode.presencial.has(id)).length;

        const presencialRequired = Math.ceil(presencialCount * 0.25);

        const ok = onlineMissing.length === 0 && presencialDone >= presencialRequired;

        if (mounted) {
          setEligible(ok);
          if (!ok) {
            let reasons = [];
            if (onlineMissing.length > 0) reasons.push(`Te faltan ${onlineMissing.length} escenarios online.`);
            if (presencialDone < presencialRequired) reasons.push(`Necesitas al menos ${presencialRequired} sesiones presenciales (has ${presencialDone}).`);
            setMessage(reasons.join(' '));
          }
        }
      } catch (e) {
        console.error('Error comprobando elegibilidad del certificado', e);
        if (mounted) setMessage('Error al comprobar elegibilidad.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    check();
    return () => { mounted = false; };
  }, [ready, session]);

  if (!ready) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Certificado de Finalización</h1>

        {loading ? (
          <div>Cargando comprobación de elegibilidad…</div>
        ) : !eligible ? (
          <div className="bg-white p-6 rounded shadow">
            <p className="text-red-600 font-medium">No eres elegible para el certificado</p>
            <p className="mt-3 text-slate-700">{message}</p>
            <div className="mt-4">
              <a href="/perfil" className="text-sm underline">Ver mi perfil</a>
            </div>
          </div>
        ) : (
          <div>
            <div id="certificate" className="bg-white border p-8 rounded shadow print:p-0 print:border-0" style={{pageBreakInside:'avoid'}}>
              <div className="flex items-center justify-between mb-8">
                <img src="/logos/huca.png" alt="HUCA" style={{height:64}} />
                <div className="text-center">
                  <h2 className="text-xl font-bold">SimuPed</h2>
                  <p className="text-sm">Hospital Universitario Central de Asturias (HUCA)</p>
                </div>
                <img src="/assets/logo-simuped.avif" alt="SimuPed" style={{height:64}} />
              </div>

              <h3 className="text-center text-2xl font-semibold mb-6">Certificado de Finalización</h3>

              <p className="text-center text-slate-700 mb-6">Se certifica que</p>

              <div className="text-center mb-6">
                <p className="text-2xl font-semibold">{profile?.nombre || session?.user?.user_metadata?.nombre || session?.user?.email}</p>
                <p className="text-sm text-slate-600">DNI: {profile?.dni || session?.user?.user_metadata?.dni || '—'}</p>
              </div>

              <p className="text-center text-slate-700 mb-6">ha completado la formación requerida en la plataforma SimuPed, alcanzando la cobertura de simulaciones online y el mínimo de participación presencial exigido.</p>

              <div className="mt-8 flex justify-between items-center">
                <div>
                  <p className="text-sm text-slate-600">Fecha de emisión</p>
                  <p className="font-medium">{formatDate(new Date().toISOString())}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Firma</p>
                  <div className="mt-2 border-t w-48" />
                  <p className="text-xs text-slate-500">Dirección de Simulación HUCA</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-x-3">
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white"
                onClick={() => window.print()}
              >Imprimir / Guardar como PDF</button>
              <a className="px-4 py-2 rounded border" href="/perfil">Volver al perfil</a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
