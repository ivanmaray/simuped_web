import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error', error, info)
    const msg = String(error?.message || '')
    // Auto-recover on common chunk/dynamic import errors (once per minute)
    if (/(ChunkLoadError|Failed to fetch dynamically imported module|import\(\) failed|Loading chunk \d+ failed)/i.test(msg)) {
      try {
        const key = 'chunk_recover_ts'
        const now = Date.now()
        const last = Number(window.sessionStorage?.getItem(key) || 0)
        if (!last || now - last > 60000) {
          window.sessionStorage?.setItem(key, String(now))
          window.location.reload()
        }
      } catch {}
    }
  }

  render() {
    const { error } = this.state
    if (error) {
      const message = error?.message || 'Ha ocurrido un error.'
      return (
        <div className="min-h-screen grid place-items-center p-6 bg-slate-50">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-5 text-slate-700">
            <h1 className="text-lg font-semibold text-slate-900">Se produjo un error</h1>
            <p className="mt-2 text-sm break-words">{message}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => window.location.reload()} className="px-3 py-1.5 rounded-md bg-[#0A3D91] text-white text-sm">Recargar</button>
              <button onClick={() => this.setState({ error: null })} className="px-3 py-1.5 rounded-md border text-sm">Ocultar</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
