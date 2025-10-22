import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const certContainerRef = useRef(null);
  const certHeroRef = useRef(null);
  const certScaleRef = useRef(null);
  const summaryContainerRef = useRef(null);
  const summaryHeroRef = useRef(null);
  const summaryScaleRef = useRef(null);
  const [scaleCert, setScaleCert] = useState(1);
  const [scaleSummary, setScaleSummary] = useState(1);
  const [exportingMode, setExportingMode] = useState(null);
  const isExporting = Boolean(exportingMode);
  const mmToPx = (mm) => Math.round((mm * 96) / 25.4);
  const wrapperRef = useRef(null);

  async function loadJsPDF() {
    // html2pdf.bundle usually exposes window.jspdf.jsPDF; some builds expose window.jsPDF
    let ctor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (ctor) return ctor;
    // Load UMD build as fallback
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
    return (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  }
  const handleDownloadPdfBasic = async () => {
    if (!eligible) return;

    const a4w = mmToPx(297);
    const a4h = mmToPx(210);
    const wrapper = wrapperRef.current;
    const originalStyles = wrapper
      ? {
          width: wrapper.style.width,
          minWidth: wrapper.style.minWidth,
          maxWidth: wrapper.style.maxWidth,
          height: wrapper.style.height,
          minHeight: wrapper.style.minHeight,
          transform: wrapper.style.transform,
          padding: wrapper.style.padding,
          margin: wrapper.style.margin,
          display: wrapper.style.display
        }
      : null;

    setExportingMode('dom-to-image');
    document.documentElement.classList.add('exporting-pdf');
    document.body.classList.add('exporting-pdf');

    if (wrapper) {
      wrapper.style.width = `${a4w}px`;
      wrapper.style.minWidth = `${a4w}px`;
      wrapper.style.maxWidth = `${a4w}px`;
      wrapper.style.height = `${a4h}px`;
      wrapper.style.minHeight = `${a4h}px`;
      wrapper.style.margin = '0 auto';
      wrapper.style.padding = '0';
      wrapper.style.transform = 'none';
      wrapper.style.display = 'block';
    }

    try {
      const [JsPdfCtor, html2canvasModule] = await Promise.all([
        loadJsPDF(),
        import('html2canvas')
      ]);
      const html2canvas = html2canvasModule?.default || html2canvasModule;

      const ensureImagesLoaded = async (root) => {
        if (!root) return;
        const imgs = Array.from(root.querySelectorAll('img'));
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise((resolve) => {
                if (img.complete && img.naturalWidth > 0) return resolve();
                const done = () => {
                  img.removeEventListener('load', done);
                  img.removeEventListener('error', done);
                  resolve();
                };
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
              })
          )
        );
      };

      await Promise.all([
        ensureImagesLoaded(certContainerRef.current),
        ensureImagesLoaded(summaryContainerRef.current)
      ]);

      await new Promise((resolve) => setTimeout(resolve, 30));

      const safe = (str) =>
        String(str || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .toLowerCase();
      const nameSlug = safe(fullName);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Certificado-SimuPed-${nameSlug || 'participante'}-${dateStr}.pdf`;

      const pdf = new JsPdfCtor({ unit: 'mm', format: 'a4', orientation: 'landscape' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageW, pageH, 'F');

      const pxPerMm = 96 / 25.4;
      const placeCover = (imgWpx, imgHpx, bleedMm = 4, padMm = 5) => {
        const areaW = Math.max(0, pageW - 2 * bleedMm);
        const areaH = Math.max(0, pageH - 2 * bleedMm);
        const usableH = Math.max(0, areaH - 2 * padMm);
        const mmW = imgWpx / pxPerMm;
        const mmH = imgHpx / pxPerMm;
        let scale = areaW / mmW;
        const maxHeight = usableH > 0 ? usableH : areaH;
        if (mmH * scale > maxHeight) {
          scale = maxHeight / mmH;
        }
        const outW = mmW * scale;
        const outH = mmH * scale;
        const x = bleedMm + (areaW - outW) / 2;
        const y = bleedMm + padMm + Math.max(0, (usableH - outH) / 2);
        return { x, y, outW, outH };
      };

      const capture = async (el) => {
        if (!el) return null;
        const previous = {
          width: el.style.width,
          minWidth: el.style.minWidth,
          maxWidth: el.style.maxWidth,
          height: el.style.height,
          minHeight: el.style.minHeight,
          margin: el.style.margin
        };
        el.style.width = `${a4w}px`;
        el.style.minWidth = `${a4w}px`;
        el.style.maxWidth = `${a4w}px`;
        el.style.height = 'auto';
        el.style.minHeight = `${a4h}px`;
        el.style.margin = '0 auto';
        try {
          const captureHeight = Math.max(el.scrollHeight || 0, a4h);
          const canvas = await html2canvas(el, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            logging: false,
            removeContainer: true,
            width: a4w,
            height: captureHeight,
            windowWidth: a4w,
            windowHeight: captureHeight,
            x: 0,
            y: 0
          });
          return {
            dataUrl: canvas.toDataURL('image/png', 1.0),
            width: canvas.width,
            height: canvas.height
          };
        } finally {
          el.style.width = previous.width;
          el.style.minWidth = previous.minWidth;
          el.style.maxWidth = previous.maxWidth;
          el.style.height = previous.height;
          el.style.minHeight = previous.minHeight;
          el.style.margin = previous.margin;
        }
      };

      const certImage = await capture(certContainerRef.current);
      if (!certImage) throw new Error('No se pudo capturar el certificado');
      const firstPlacement = placeCover(certImage.width, certImage.height);
      pdf.addImage(certImage.dataUrl, 'PNG', firstPlacement.x, firstPlacement.y, firstPlacement.outW, firstPlacement.outH, undefined, 'SLOW');

      if (hasSummary && summaryContainerRef.current) {
        const summaryImage = await capture(summaryContainerRef.current);
        if (summaryImage) {
          pdf.addPage('a4', 'landscape');
          const summaryPlacement = placeCover(summaryImage.width, summaryImage.height);
          pdf.addImage(summaryImage.dataUrl, 'PNG', summaryPlacement.x, summaryPlacement.y, summaryPlacement.outW, summaryPlacement.outH, undefined, 'SLOW');
        }
      }

      pdf.save(fileName);
    } catch (e) {
      console.warn('Error exportando PDF (alternativo)', e);
      alert('No se pudo exportar el PDF. Inténtalo de nuevo.');
    } finally {
      if (wrapper) {
        wrapper.style.width = originalStyles?.width || '';
        wrapper.style.minWidth = originalStyles?.minWidth || '';
        wrapper.style.maxWidth = originalStyles?.maxWidth || '';
        wrapper.style.height = originalStyles?.height || '';
        wrapper.style.minHeight = originalStyles?.minHeight || '';
        wrapper.style.transform = originalStyles?.transform || '';
        wrapper.style.padding = originalStyles?.padding || '';
        wrapper.style.margin = originalStyles?.margin || '';
        wrapper.style.display = originalStyles?.display || '';
      }
      document.documentElement.classList.remove('exporting-pdf');
      document.body.classList.remove('exporting-pdf');
      setExportingMode(null);
    }
  };

  const handleDownloadPdf = handleDownloadPdfBasic;

  useEffect(() => {
    // Ensure print exports use landscape A4 and hide surrounding chrome
    const styleTag = document.createElement('style');
    styleTag.setAttribute('data-cert-print', 'true');
    styleTag.innerHTML = `
      @page {
        size: A4 landscape;
        margin: 0mm 10mm 10mm 10mm;
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
        /* Ensure any on-screen scaling is disabled in print */
        #certificate-root .cert-content-scale,
        #certificate-summary .cert-content-scale {
          transform: none !important;
        }
        /* Reduce hero visual height only in print (avoid clipping content) */
        #certificate-root .hero-section {
          overflow: visible !important;
        }
        #certificate-root .hero-section .hero-bg { display: none !important; }
        .bg-white\\/10 { background-color: rgba(255,255,255,0.1) !important; }
        #certificate-root .hero-section .hero-bg {
          top: 0 !important;
          bottom: auto !important;
          height: 28mm !important;
          background-size: cover !important;
          background-position: top center !important;
        }
        #certificate-root .hero-section .hero-content {
          padding-top: 8mm !important;
          padding-bottom: 8mm !important;
        }
        #certificate-root .hero-section img {
          height: 44px !important;
        }
        #certificate-root .hero-section h2 {
          font-size: 1.6rem !important;
        }
        #certificate-root .hero-section p {
          font-size: 0.7rem !important;
        }
      }
      /* PDF export (html2pdf) should not apply transforms */

      /* Remove page padding and margin for flush-to-top PDF export */
      body.exporting-pdf .certificate-page { padding: 0 !important; }
      body.exporting-pdf .print\\:hidden { display: none !important; }
      body.exporting-pdf .export-hide { display: none !important; }
      body.exporting-pdf #certificate-root { margin: 0 auto !important; }

      /* During html2pdf export, override Tailwind v4 OKLCH/OKLAB variables with sRGB hex fallbacks
         to avoid html2canvas "unsupported color function oklch/oklab" parsing errors */
      body.exporting-pdf {
        /* Slate scale */
        --color-slate-50: #f8fafc;
        --color-slate-100: #f1f5f9;
        --color-slate-200: #e2e8f0;
        --color-slate-300: #cbd5e1;
        --color-slate-400: #94a3b8;
        --color-slate-500: #64748b;
        --color-slate-600: #475569;
        --color-slate-700: #334155;
        --color-slate-800: #1e293b;
        --color-slate-900: #0f172a;

        /* Blue scale */
        --color-blue-50: #eff6ff;
        --color-blue-100: #dbeafe;
        --color-blue-200: #bfdbfe;
        --color-blue-300: #93c5fd;
        --color-blue-400: #60a5fa;
        --color-blue-500: #3b82f6;
        --color-blue-600: #2563eb;
        --color-blue-700: #1d4ed8;
        --color-blue-800: #1e40af;
        --color-blue-900: #1e3a8a;

        /* Emerald scale */
        --color-emerald-50: #ecfdf5;
        --color-emerald-100: #d1fae5;
        --color-emerald-200: #a7f3d0;
        --color-emerald-300: #6ee7b7;
        --color-emerald-500: #10b981;
        --color-emerald-600: #059669;
        --color-emerald-700: #047857;
        --color-emerald-800: #065f46;

        /* Sky scale */
        --color-sky-50: #f0f9ff;
        --color-sky-100: #e0f2fe;
        --color-sky-200: #bae6fd;
        --color-sky-300: #7dd3fc;
        --color-sky-700: #0369a1;
        --color-sky-800: #075985;
        --color-sky-900: #0c4a6e;

        /* Orange scale */
        --color-orange-500: #f97316;

        /* Gray scale */
        --color-gray-100: #f3f4f6;
        --color-gray-300: #d1d5db;
        --color-gray-500: #6b7280;
        --color-gray-800: #1f2937;
        --color-gray-900: #111827;

        /* White and black */
        --color-white: #ffffff;
        --color-black: #000000;

        /* Override gradient positions to avoid oklab */
        --tw-gradient-position: initial;
      }

      /* Override opacity backgrounds that use color-mix with oklab */
      body.exporting-pdf .bg-white\\/10 {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }

      /* Override gradient color spaces */
      body.exporting-pdf .bg-gradient-to-b {
        --tw-gradient-position: to bottom;
      }

      /* Fix hero section for PDF export */
      body.exporting-pdf #certificate-root {
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
      }
      body.exporting-pdf .hero-section {
        padding: 0 !important;
        height: 70mm !important;
        background: linear-gradient(135deg, #0A3D91 0%, #1E6ACB 100%) !important;
        display: flex !important;
        align-items: center !important;
        width: calc(100% + 24mm) !important;
        margin-left: -12mm !important;
        margin-right: -12mm !important;
      }
      body.exporting-pdf .hero-bg {
        display: none !important;
      }
      body.exporting-pdf .hero-content {
        position: relative !important;
        padding: 32px 40px !important;
        width: 100% !important;
        display: flex !important;
        flex-direction: row !important;
        justify-content: center !important;
        align-items: center !important;
        gap: 32px !important;
        text-align: center !important;
      }
      body.exporting-pdf .hero-content .text-center {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
        text-align: center !important;
        gap: 6px !important;
        padding-top: 12px !important;
      }
      body.exporting-pdf .hero-content > img,
      body.exporting-pdf .hero-content img {
        height: 64px !important;
      }

      /* NEW: Reset margins and enforce centering for export */
      html.exporting-pdf, body.exporting-pdf { margin: 0 !important; padding: 0 !important; }
      body.exporting-pdf [data-cert-wrapper] {
        width: 297mm !important;
        min-width: 297mm !important;
        max-width: 297mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        display: block !important;
      }
      body.exporting-pdf #certificate-root,
      body.exporting-pdf #certificate-summary {
        margin: 0 auto !important;
      }
      body.exporting-pdf [data-cert-wrapper] .border,
      body.exporting-pdf [data-cert-wrapper] [class*="border-"] {
        border-width: 0 !important;
        border-color: transparent !important;
      }
      body.exporting-pdf [data-cert-wrapper] [class*="shadow"] {
        box-shadow: none !important;
      }
      body.exporting-pdf [data-cert-wrapper] .bg-slate-50,
      body.exporting-pdf [data-cert-wrapper] .bg-slate-100,
      body.exporting-pdf [data-cert-wrapper] .bg-white\/10 {
        background-color: transparent !important;
      }
      /* Hard reset of outlines/shadows during export to avoid raster hairlines */
      body.exporting-pdf [data-cert-wrapper] *,
      body.exporting-pdf [data-cert-wrapper] *::before,
      body.exporting-pdf [data-cert-wrapper] *::after {
        outline: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        image-rendering: -webkit-optimize-contrast !important;
      }
    `;
    document.head.appendChild(styleTag);
    return () => {
      document.head.removeChild(styleTag);
    };
  }, []);

  // Screen-only autoscale to fit content into fixed A4 height
  useEffect(() => {
    function recompute() {
      try {
        const container = certContainerRef.current;
        const hero = certHeroRef.current;
        const scaleEl = certScaleRef.current;
        if (container && scaleEl) {
          const totalH = container.clientHeight || 0;
          const heroH = hero?.offsetHeight || 0;
          const avail = Math.max(0, totalH - heroH);
          const needed = scaleEl.scrollHeight || 0;
          let s = 1;
          if (needed > avail && avail > 0) {
            s = Math.max(0.82, Math.min(1, avail / needed));
          }
          setScaleCert(s);
        }
        const sContainer = summaryContainerRef.current;
        const sHero = summaryHeroRef.current;
        const sScale = summaryScaleRef.current;
        if (sContainer && sScale) {
          const totalH2 = sContainer.clientHeight || 0;
          const heroH2 = sHero?.offsetHeight || 0;
          const avail2 = Math.max(0, totalH2 - heroH2);
          const needed2 = sScale.scrollHeight || 0;
          let s2 = 1;
          if (needed2 > avail2 && avail2 > 0) {
            s2 = Math.max(0.82, Math.min(1, avail2 / needed2));
          }
          setScaleSummary(s2);
        }
      } catch {}
    }

    const r = () => requestAnimationFrame(recompute);
    r();
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, [loading, eligible, onlineSummaries.length, presencialSummaries.length]);

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
          setMessage('');
        }
        // En modo prueba, carga el perfil si hay sesión para mostrar DNI/nombre reales
        try {
          if (session?.user) {
            const { data: prof, error: profErr } = await supabase
              .from('profiles')
              .select('id, nombre, apellidos, dni')
              .eq('id', session.user.id)
              .maybeSingle();
            if (!profErr && prof && mounted) {
              setProfileDetails(prof);
            }
          }
        } catch (e) {
          console.warn('Preview: error cargando perfil', e);
        } finally {
          if (mounted) setLoading(false);
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
  <main className="certificate-page max-w-none mx-auto px-6 py-8 print:max-w-none print:px-0 print:py-0">
        <h1 className="text-2xl font-semibold mb-4 print:hidden export-hide">Certificado de Finalización</h1>

        {loading ? (
          <div className="print:hidden">Cargando comprobación de elegibilidad…</div>
        ) : !eligible ? (
          <div className="bg-white p-6 rounded shadow print:hidden">
            <div className="mb-4 text-slate-700 text-sm leading-relaxed">
              <p className="font-semibold text-slate-800 mb-2">Requisitos para obtener el certificado:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Completar la totalidad de los escenarios <strong>online</strong> disponibles en la plataforma SimuPed.</li>
                <li>Participar al menos en un <strong>25 %</strong> de las sesiones de simulación <strong>presencial</strong>.</li>
                <li>Contar con un perfil completo y validado (nombre, apellidos y DNI) en SimuPed.</li>
              </ul>
            </div>
            <p className="text-red-600 font-medium">No eres elegible para el certificado</p>
            <p className="mt-3 text-slate-700">{message}</p>
            <div className="mt-4">
              <a href="/perfil" className="text-sm underline">Ver mi perfil</a>
            </div>
          </div>
        ) : (
          <div ref={wrapperRef} data-cert-wrapper>
            <div className="flex w-full justify-center overflow-x-auto">
              <div
                id="certificate-root"
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl print:shadow-none print:border-0 print:rounded-none"
                style={{
                  pageBreakInside: 'avoid',
                  width: '297mm',
                  minWidth: '297mm',
                  maxWidth: '297mm',
                  height: '210mm',
                  minHeight: '210mm',
                  boxSizing: 'border-box',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                ref={certContainerRef}
              >
                <div
                  className="relative hero-section"
                  style={{
                    background: 'linear-gradient(135deg,#0A3D91,#1E6ACB)',
                    color: '#fff'
                  }}
                  ref={certHeroRef}
                >
                  <div className="absolute inset-0 opacity-25 hero-bg" style={{ backgroundImage: 'url(/videohero3.gif)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="relative hero-content px-10 py-8 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <img src="/logos/huca.png" crossOrigin="anonymous" alt="HUCA" className="h-16 md:h-20 bg-white/10 backdrop-blur-md p-3 rounded-2xl" />
                    <div className="text-center flex-1">
                      <h2 className="text-3xl font-bold tracking-tight">SimuPed</h2>
                      <p className="text-sm uppercase tracking-[0.35em] text-sky-100">Hospital Universitario Central de Asturias</p>
                    </div>
                    {logoState.visible ? (
                      <img
                        src={logoState.src}
                        crossOrigin="anonymous"
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

                <div className="cert-content-scale" style={{ transform: `scale(${scaleCert})`, transformOrigin: 'top center' }} ref={certScaleRef}>
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
          </div>

          {hasSummary && (
            <>
            <div className="html2pdf__page-break" />
            <div className="mt-12 flex w-full justify-center overflow-x-auto print:mt-0">
              <div
                id="certificate-summary"
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl print:shadow-none print:border-0 print:rounded-none"
                style={{
                  width: '297mm',
                  minWidth: '297mm',
                  maxWidth: '297mm',
                  height: '210mm',
                  minHeight: '210mm',
                  boxSizing: 'border-box',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                ref={summaryContainerRef}
              >
                <div
                  className="relative"
                  style={{
                    background: 'linear-gradient(135deg,#0A3D91,#1E6ACB)',
                    color: '#fff'
                  }}
                  ref={summaryHeroRef}
                >
                  <div className="relative px-10 py-6 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <img src="/logos/huca.png" crossOrigin="anonymous" alt="HUCA" className="h-14 md:h-16 bg-white/10 backdrop-blur-md p-3 rounded-2xl" />
                    <div className="text-center flex-1">
                      <h2 className="text-2xl font-semibold tracking-tight">Resumen de Participación</h2>
                      <p className="text-xs uppercase tracking-[0.35em] text-sky-100">SimuPed · HUCA</p>
                    </div>
                    {logoState.visible ? (
                      <img
                        src={logoState.src}
                        crossOrigin="anonymous"
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

                <div className="cert-content-scale" style={{ transform: `scale(${scaleSummary})`, transformOrigin: 'top center' }} ref={summaryScaleRef}>
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
            </div>
            </>
          )}

            <div className="mt-6 flex items-center gap-3 print:hidden">
              <button
                className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-60"
                onClick={handleDownloadPdf}
                disabled={isExporting}
              >{exportingMode ? 'Generando…' : 'Descargar PDF'}</button>
              <a className="px-4 py-2 rounded border" href="/perfil">Volver al perfil</a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
