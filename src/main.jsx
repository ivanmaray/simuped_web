// src/main.jsx
import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import MainRouter from './MainRouter.jsx'
import { AuthProvider } from './auth.jsx'
import { Analytics } from '@vercel/analytics/react'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// Global listeners to recover on dynamic import/chunk load errors
if (typeof window !== 'undefined') {
  const shouldRecover = (msg) => /ChunkLoadError|Failed to fetch dynamically imported module|import\(\) failed|Loading chunk \d+ failed/i.test(msg || '')
  const throttle = (key, ms) => {
    try {
      const now = Date.now();
      const last = Number(window.sessionStorage?.getItem(key) || 0)
      if (!last || now - last > ms) {
        window.sessionStorage?.setItem(key, String(now))
        return true
      }
    } catch {}
    return false
  }
  window.addEventListener('unhandledrejection', (e) => {
    const msg = String(e?.reason?.message || e?.reason || '')
    if (shouldRecover(msg) && throttle('chunk_recover_ts', 60000)) {
      window.location.reload()
    }
  })
  window.addEventListener('error', (e) => {
    const msg = String(e?.message || '')
    if (shouldRecover(msg) && throttle('chunk_recover_ts', 60000)) {
      window.location.reload()
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <ErrorBoundary>
          <MainRouter />
        </ErrorBoundary>
      </BrowserRouter>
      <Analytics />
    </AuthProvider>
  </StrictMode>
);

// Mark app mounted (used by boot watchdog in index.html)
try { window.__APP_MOUNTED__ = true } catch {}