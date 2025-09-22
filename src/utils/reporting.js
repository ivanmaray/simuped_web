export function reportError(scope, error, extras) {
  const detail = { scope, error, extras };
  try {
    if (extras) {
      console.error(`[${scope}]`, error, extras);
    } else {
      console.error(`[${scope}]`, error);
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('simuped:error', { detail }));
      window.__SIMUPED_ERRORS__ = window.__SIMUPED_ERRORS__ || [];
      window.__SIMUPED_ERRORS__.push(detail);
    }
  } catch {}
}

export function reportWarning(scope, error, extras) {
  const detail = { scope, error, extras };
  try {
    if (extras) {
      console.warn(`[${scope}]`, error, extras);
    } else {
      console.warn(`[${scope}]`, error);
    }
  } catch {}
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('simuped:warn', { detail }));
      window.__SIMUPED_WARNINGS__ = window.__SIMUPED_WARNINGS__ || [];
      window.__SIMUPED_WARNINGS__.push(detail);
    }
  } catch {}
}
