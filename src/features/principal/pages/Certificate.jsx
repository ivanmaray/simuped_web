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
  const [profileDetails, setProfileDetails] = useState(null);
  const [onlineSummaries, setOnlineSummaries] = useState([]);
  const [presencialSummaries, setPresencialSummaries] = useState([]);
  const [signatureVisibility, setSignatureVisibility] = useState({ ivan: true, andres: true });
  const [signatureSources, setSignatureSources] = useState({
    ivan: '/firma_ivan_maray.avif',
    andres: '/firma_andres_concha.avif'
  });
  const initialLogoSrc = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CERT_LOGO_PATH)
    ? import.meta.env.VITE_CERT_LOGO_PATH
    : '/logo-simuped-Dtpd4WLf.avif';
  const [logoState, setLogoState] = useState({
    src: initialLogoSrc,
    visible: true
  });
  const hasSummary = (onlineSummaries.length > 0 || presencialSummaries.length > 0);
  const isPreview = searchParams.has('prueba');

  useEffect(() => {
    // Ensure print exports use landscape A4 and hide surrounding chrome
    const styleTag = document.createElement('style');
    styleTag.setAttribute('data-cert-print', 'true');
    styleTag.innerHTML = `
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #fff !important;
        }
        main.certificate-page {
          margin: 0 !important;
          padding: 0 !important;
        }
        #certificate-root,
        #certificate-summary {
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          margin: 0 auto !important;
          width: calc(297mm - 20mm) !important;
          min-height: calc(210mm - 20mm) !important;
          page-break-inside: avoid !important;
        }
        #certificate-summary {
          page-break-before: always !important;
        }
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  const resolvedProfile = profileDetails || profile;

  const fullName = useMemo(() => {
    const pieces = [resolvedProfile?.nombre, resolvedProfile?.apellidos].filter(Boolean);
    if (pieces.length > 0) return pieces.join(' ');
    const metaPieces = [session?.user?.user_metadata?.nombre, session?.user?.user_metadata?.apellidos].filter(Boolean);
    if (metaPieces.length > 0) return metaPieces.join(' ');
    return session?.user?.email || 'Participante SimuPed';
  }, [
    resolvedProfile?.nombre,
    resolvedProfile?.apellidos,
    session?.user?.user_metadata?.nombre,
    session?.user?.user_metadata?.apellidos,
    session?.user?.email
  ]);

  const dniValue = useMemo(() => {
    const raw = resolvedProfile?.dni || session?.user?.user_metadata?.dni;
    if (!raw) return 'No disponible';
    return String(raw).toUpperCase();
  }, [resolvedProfile?.dni, session?.user?.user_metadata?.dni]);

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

      // Load scenarios, profile details and user attempts
      try {
        const normalizeMode = (mode) => {
          const arr = Array.isArray(mode) ? mode : mode ? [mode] : [];
          return arr.map((m) => String(m || '').toLowerCase());
        };

        const [profileResponse, scenariosResponse, attemptsResponse] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, nombre, apellidos, dni')
            .eq('id', session.user.id)
            .maybeSingle(),
          supabase.from('scenarios').select('id, title, mode'),
          supabase
            .from('attempts')
            .select('scenario_id, score, started_at, finished_at, scenarios (id, title, mode)')
            .eq('user_id', session.user.id)
        ]);

        if (profileResponse?.data && mounted) {
          setProfileDetails(profileResponse.data);
        }
        if (profileResponse?.error) {
          console.warn('Error cargando perfil para certificado', profileResponse.error);
        }

        const scenarios = scenariosResponse?.data || [];
        const scenarioMap = new Map();
        scenarios.forEach(s => scenarioMap.set(s.id, s));

        const attempts = attemptsResponse?.data || [];
        if (attemptsResponse?.error) {
          console.warn('Error cargando intentos para certificado', attemptsResponse.error);
        }

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
        const scenarioStats = new Map();
        (attempts || []).forEach(a => {
          const scenId = a?.scenario_id;
          if (!scenId) return;
          const scenario = scenarioMap.get(scenId) || a?.scenarios || null;
          const normalized = normalizeMode(scenario?.mode);
          if (!scenarioStats.has(scenId)) {
            scenarioStats.set(scenId, {
              scenarioId: scenId,
              title: scenario?.title || `Escenario ${scenId}`,
              modes: normalized,
              attempts: []
            });
          }
          const entry = scenarioStats.get(scenId);
          entry.modes = normalized.length ? normalized : entry.modes;
          entry.attempts.push({
            score: typeof a?.score === 'number' ? a.score : (a?.score != null ? Number(a.score) : null),
            finished_at: a?.finished_at || null,
            started_at: a?.started_at || null
          });

          normalized.forEach((m) => {
            if (m.includes('online')) attemptedByMode.online.add(scenId);
            if (m.includes('presencial')) attemptedByMode.presencial.add(scenId);
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
          const onlineAggregates = [];
          const presencialAggregates = [];
          scenarioStats.forEach((entry) => {
            if (!entry || entry.attempts.length === 0) return;
            const attemptsList = entry.attempts;
            const scoreValues = attemptsList
              .map((item) => (typeof item.score === 'number' && !Number.isNaN(item.score) ? item.score : null))
              .filter((val) => val !== null);
            const lastCompleted = attemptsList.reduce((acc, item) => {
              const candidate = item.finished_at || item.started_at;
              if (!candidate) return acc;
              const candidateTime = new Date(candidate).getTime();
              if (!acc) return candidate;
              return candidateTime > new Date(acc).getTime() ? candidate : acc;
            }, null);

            if (entry.modes.some((m) => m.includes('online'))) {
              onlineAggregates.push({
                scenarioId: entry.scenarioId,
                title: entry.title,
                attemptCount: attemptsList.length,
                averageScore: scoreValues.length > 0 ? scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length : null,
                lastCompleted
              });
            }

            if (entry.modes.some((m) => m.includes('presencial'))) {
              presencialAggregates.push({
                scenarioId: entry.scenarioId,
                title: entry.title,
                participationCount: attemptsList.length,
                lastCompleted
              });
            }
          });

          setOnlineSummaries(onlineAggregates.sort((a, b) => a.title.localeCompare(b.title)));
          setPresencialSummaries(presencialAggregates.sort((a, b) => a.title.localeCompare(b.title)));
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
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="certificate-page max-w-5xl mx-auto px-6 py-8 print:max-w-none print:px-0 print:py-0">
        <h1 className="text-2xl font-semibold mb-4 print:hidden">Certificado de Finalización</h1>

        {loading ? (
          <div className="print:hidden">Cargando comprobación de elegibilidad…</div>
        ) : !eligible ? (
          <div className="bg-white p-6 rounded shadow print:hidden">
            <p className="text-red-600 font-medium">No eres elegible para el certificado</p>
            <p className="mt-3 text-slate-700">{message}</p>
            <div className="mt-4">
              <a href="/perfil" className="text-sm underline">Ver mi perfil</a>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-center">
              <div
                id="certificate-root"
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl print:shadow-none print:border-0 print:rounded-none"
                style={{
                  pageBreakInside: 'avoid',
                  width: 'min(92vw, 1120px)',
                  minHeight: '794px',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
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
                    {logoState.visible ? (
                      <img
                        src={logoState.src}
                        alt="SimuPed"
                        className="h-16 md:h-20 bg-white/10 backdrop-blur-md p-3 rounded-2xl"
                        onError={() => {
                          setLogoState((prev) => {
                            if (prev.src !== logoSimuped) {
                              return { ...prev, src: logoSimuped };
                            }
                            return { ...prev, visible: false };
                          });
                        }}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="px-8 py-10 md:px-14 md:py-12">
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
                      {signatureVisibility.ivan ? (
                        <img
                          src={signatureSources.ivan}
                          alt="Firma Iván Maray"
                          className="h-full object-contain"
                          onError={() => {
                            setSignatureSources((prev) => {
                              if (prev.ivan !== '/firma_ivan_maray.png') {
                                return { ...prev, ivan: '/firma_ivan_maray.png' };
                              }
                              setSignatureVisibility((visibility) => ({ ...visibility, ivan: false }));
                              return prev;
                            });
                          }}
                        />
                      ) : (
                        <span className="text-3xl font-semibold text-slate-600" style={{ fontFamily: 'cursive' }}>Iván Maray</span>
                      )}
                    </div>
                    <div className="border-t border-slate-300 mx-auto w-56" />
                    <p className="mt-3 font-semibold text-slate-800">Iván Maray</p>
                    <p className="text-sm text-slate-500">Coordinador SimuPed</p>
                  </div>
                  <div className="text-center">
                    <div className="h-24 flex items-center justify-center mb-4">
                      {signatureVisibility.andres ? (
                        <img
                          src={signatureSources.andres}
                          alt="Firma Andrés Concha"
                          className="h-full object-contain"
                          onError={() => {
                            setSignatureSources((prev) => {
                              if (prev.andres !== '/firma_andres_concha.png') {
                                return { ...prev, andres: '/firma_andres_concha.png' };
                              }
                              setSignatureVisibility((visibility) => ({ ...visibility, andres: false }));
                              return prev;
                            });
                          }}
                        />
                      ) : (
                        <span className="text-3xl font-semibold text-slate-600" style={{ fontFamily: 'cursive' }}>Andrés Concha Torre</span>
                      )}
                    </div>
                    <div className="border-t border-slate-300 mx-auto w-56" />
                    <p className="mt-3 font-semibold text-slate-800">Andrés Concha Torre</p>
                    <p className="text-sm text-slate-500">Dirección de Simulación HUCA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasSummary && (
            <div className="mt-12 flex justify-center print:mt-0">
              <div
                id="certificate-summary"
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl print:shadow-none print:border-0 print:rounded-none"
                style={{
                  width: 'min(92vw, 1120px)',
                  minHeight: '794px',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div
                  className="relative"
                  style={{
                    background: 'linear-gradient(135deg,#0A3D91,#1E6ACB)',
                    color: '#fff'
                  }}
                >
                  <div className="relative px-10 py-6 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <img src="/logos/huca.png" alt="HUCA" className="h-14 md:h-16 bg-white/10 backdrop-blur-md p-3 rounded-2xl" />
                    <div className="text-center flex-1">
                      <h2 className="text-2xl font-semibold tracking-tight">Resumen de Participación</h2>
                      <p className="text-xs uppercase tracking-[0.35em] text-sky-100">SimuPed · HUCA</p>
                    </div>
                    {logoState.visible ? (
                      <img
                        src={logoState.src}
                        alt="SimuPed"
                        className="h-14 md:h-16 bg-white/10 backdrop-blur-md p-3 rounded-2xl"
                        onError={() => {
                          setLogoState((prev) => {
                            if (prev.src !== logoSimuped) {
                              return { ...prev, src: logoSimuped };
                            }
                            return { ...prev, visible: false };
                          });
                        }}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex-1 px-8 py-10 md:px-12 md:py-12">
                  <p className="text-center text-sm text-slate-500 max-w-3xl mx-auto">
                    Este anexo resume la participación de <strong>{fullName}</strong> en la plataforma SimuPed. Las medias se calculan por escenario completado.
                  </p>

                  <div className="mt-10 grid gap-10 md:grid-cols-2">
                    <section>
                      <header className="mb-4">
                        <h3 className="text-base font-semibold text-slate-800">Simulaciones online</h3>
                        <p className="text-xs text-slate-500">Media de puntuaciones y número de intentos</p>
                      </header>
                      <ul className="space-y-3 text-sm text-slate-600">
                        {onlineSummaries.length === 0 ? (
                          <li className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-400">Sin simulaciones online registradas</li>
                        ) : (
                          onlineSummaries.map((row) => (
                            <li key={`summary-online-${row.scenarioId}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-slate-800 truncate" title={row.title}>{row.title}</span>
                                <span className="text-[#0A3D91] font-semibold">{row.averageScore != null ? `${Math.round(row.averageScore)}%` : 'S/N'}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap items-center justify-between text-xs text-slate-500">
                                <span>{row.attemptCount} intento{row.attemptCount === 1 ? '' : 's'}</span>
                                {row.lastCompleted && <span>Última: {formatDate(row.lastCompleted)}</span>}
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </section>

                    <section>
                      <header className="mb-4">
                        <h3 className="text-base font-semibold text-slate-800">Participaciones presenciales</h3>
                        <p className="text-xs text-slate-500">Sesiones realizadas por escenario</p>
                      </header>
                      <ul className="space-y-3 text-sm text-slate-600">
                        {presencialSummaries.length === 0 ? (
                          <li className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-400">Sin registros presenciales</li>
                        ) : (
                          presencialSummaries.map((row) => (
                            <li key={`summary-presencial-${row.scenarioId}`} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-slate-800 truncate" title={row.title}>{row.title}</span>
                                <span className="text-slate-500">{row.participationCount} sesión{row.participationCount === 1 ? '' : 'es'}</span>
                              </div>
                              {row.lastCompleted && (
                                <div className="mt-1 text-xs text-slate-500 text-right">Última: {formatDate(row.lastCompleted)}</div>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                    </section>
                  </div>

                  <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Notas adicionales</h4>
                    <p className="text-sm text-slate-600">
                      La confirmación de asistencia presencial se realiza mediante invitación individual. Consulta el panel de SimuPed para descargar reportes detallados de cada escenario.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

            <div className="mt-6 space-x-3 print:hidden">
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
