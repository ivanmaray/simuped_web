export default function Spinner({ label = "Cargando…", size = 32 }) {
	const px = Number(size) || 32;
	return (
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
}
