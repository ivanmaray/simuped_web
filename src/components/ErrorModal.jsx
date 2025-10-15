import { useEffect } from "react";

export default function ErrorModal({
	title = "Algo no ha salido bien",
	message,
	details,
	actionLabel = "Cerrar",
	onClose,
}) {
	const hasContent = Boolean(message || details);

	useEffect(() => {
		if (!hasContent) return;
		function handleKeydown(event) {
			if (event.key === "Escape") {
				try { onClose?.(); } catch {}
			}
		}
		window.addEventListener("keydown", handleKeydown);
		return () => window.removeEventListener("keydown", handleKeydown);
	}, [hasContent, onClose]);

	if (!hasContent) return null;

	function close() {
		try { onClose?.(); } catch {}
	}

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center px-4"
			role="alertdialog"
			aria-modal="true"
			aria-labelledby="error-modal-title"
			aria-describedby="error-modal-message"
		>
			<div className="absolute inset-0 bg-slate-900/60" onClick={close} />
			<div className="relative z-[101] w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
				<div className="px-5 py-4 border-b border-slate-200">
					<h2 id="error-modal-title" className="text-lg font-semibold text-slate-900">
						{title}
					</h2>
				</div>
				<div className="px-5 py-4 space-y-3 text-sm text-slate-700">
					{message && (
						<p id="error-modal-message" className="leading-relaxed">
							{message}
						</p>
					)}
					{details && (
						<pre className="bg-slate-100 text-slate-600 rounded-lg p-3 overflow-x-auto text-xs">
							{typeof details === "string" ? details : JSON.stringify(details, null, 2)}
						</pre>
					)}
				</div>
				<div className="px-5 py-4 border-t border-slate-200 flex justify-end">
					<button
						type="button"
						onClick={close}
						className="inline-flex items-center rounded-lg border border-transparent bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
					>
						{actionLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
