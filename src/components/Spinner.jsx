import { useEffect } from 'react'

export default function Spinner({ label = "Cargando…", size = 32, centered = false, autoReloadMs = 5000, autoReloadCooldownMs = 60000 }) {
	const px = Number(size) || 32;

	// Auto-refresh if a centered spinner stays too long (helps break stuck loading loops)
	useEffect(() => {
		if (!centered || !autoReloadMs || autoReloadMs <= 0) return;
		const id = window.setTimeout(() => {
			try {
				const key = 'spinner_autoreload_ts';
				const now = Date.now();
				const last = Number(window.sessionStorage?.getItem(key) || 0);
				if (!last || now - last > autoReloadCooldownMs) {
					window.sessionStorage?.setItem(key, String(now));
					window.location.reload();
				}
			} catch {}
		}, autoReloadMs);

		return () => window.clearTimeout(id);
	}, [centered, autoReloadMs, autoReloadCooldownMs]);

	const inner = (
		<div className="inline-flex flex-col items-center justify-center gap-2" role="status" aria-live="polite">
			<svg
				className="text-[#0A3D91] animate-spin"
				width={px}
				height={px}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" className="opacity-20" />
				<path d="M22 12a10 10 0 0 0-10-10" />
			</svg>
			{label && <span className="text-xs text-slate-500">{label}</span>}
		</div>
	);

	if (centered) {
		return (
			<div className="min-h-screen grid place-items-center">
				{inner}
			</div>
		);
	}
	return inner;
}
