import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../auth';
import Navbar from '../../../components/Navbar.jsx';
import logoSimuped from '../../../assets/logo-simuped.avif';

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
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [message, setMessage] = useState('');
  const isPreview = searchParams.has('prueba');

  const fullName = useMemo(() => {
    const pieces = [profile?.nombre, profile?.apellidos].filter(Boolean);
    if (pieces.length > 0) return pieces.join(' ');
    const metaPieces = [session?.user?.user_metadata?.nombre, session?.user?.user_metadata?.apellidos].filter(Boolean);
    if (metaPieces.length > 0) return metaPieces.join(' ');
    return session?.user?.email || 'Participante SimuPed';
  }, [
    profile?.nombre,
    profile?.apellidos,
    session?.user?.user_metadata?.nombre,
    session?.user?.user_metadata?.apellidos,
    session?.user?.email
  ]);

  const dniValue = useMemo(() => {
    return profile?.dni || session?.user?.user_metadata?.dni || '—';
  }, [profile?.dni, session?.user?.user_metadata?.dni]);

  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!ready) return;

      if (isPreview) {
        if (mounted) {
          setEligible(true);
          setLoading(false);
          setMessage('');
        }
        return;
      }
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
  }, [ready, session, isPreview]);

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
            <div
              id="certificate"
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl print:p-0 print:border-0"
              style={{ pageBreakInside: 'avoid' }}
            >
              <div
                className="relative"
                style={{
                  background: 'linear-gradient(135deg,#0A3D91,#1E6ACB)',
                  color: '#fff'
                }}
              >
                <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'url(/videohero3.gif)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div className="relative px-10 py-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <img src="/logos/huca.png" alt="HUCA" className="h-16 md:h-20 bg-white/10 backdrop-blur-md p-3 rounded-2xl" />
                  <div className="text-center flex-1">
                    <h2 className="text-3xl font-bold tracking-tight">SimuPed</h2>
                    <p className="text-sm uppercase tracking-[0.35em] text-sky-100">Hospital Universitario Central de Asturias</p>
                  </div>
                  <img src={logoSimuped} alt="SimuPed" className="h-16 md:h-20 bg-white/10 backdrop-blur-md p-3 rounded-2xl" />
                </div>
              </div>

              <div className="px-10 py-12 md:px-16 md:py-14">
                {isPreview ? (
                  <div className="text-center mb-4 uppercase text-orange-500 text-xs font-semibold tracking-[0.45em]">Certificado de prueba</div>
                ) : null}

                <div className="text-center mb-10">
                  <h3 className="text-3xl font-semibold text-slate-900">Certificado de Finalización</h3>
                  <p className="mt-4 text-base text-slate-600">Se certifica que</p>
                </div>

                <div className="text-center mb-10">
                  <p className="text-[32px] leading-tight font-semibold text-slate-900">{fullName}</p>
                  <p className="mt-3 text-base text-slate-500">DNI: <span className="font-medium text-slate-700">{dniValue}</span></p>
                </div>

                <p className="text-center text-lg text-slate-700 max-w-3xl mx-auto leading-relaxed">
                  ha completado la formación requerida en la plataforma <strong>SimuPed</strong>, cumpliendo la totalidad de simulaciones online y alcanzando el mínimo de participación presencial estipulado por la Dirección de Simulación Pediátrica del HUCA.
                </p>

                <div className="mt-14 grid gap-10 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-left">
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Fecha de emisión</p>
                    <p className="mt-3 text-xl font-semibold text-slate-800">{formatDate(new Date().toISOString())}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-left">
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Número de registro</p>
                    <p className="mt-3 text-xl font-semibold text-slate-800">SIMUPED-{(session?.user?.id || profile?.id || 'PREVIEW').slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="mt-14 grid gap-12 md:grid-cols-2">
                  <div className="text-center">
                    <div className="h-24 flex items-center justify-center mb-4">
                      <img src="/firma_ivan_maray.avif" alt="Firma Ivan Maray" className="h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div className="border-t border-slate-300 mx-auto w-56" />
                    <p className="mt-3 font-semibold text-slate-800">Iván Maray</p>
                    <p className="text-sm text-slate-500">Coordinador SimuPed</p>
                  </div>
                  <div className="text-center">
                    <div className="h-24 flex items-center justify-center mb-4">
                      <img src="/firma_andres_concha.avif" alt="Firma Andrés Concha" className="h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    </div>
                    <div className="border-t border-slate-300 mx-auto w-56" />
                    <p className="mt-3 font-semibold text-slate-800">Andrés Concha Torre</p>
                    <p className="text-sm text-slate-500">Dirección de Simulación HUCA</p>
                  </div>
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
