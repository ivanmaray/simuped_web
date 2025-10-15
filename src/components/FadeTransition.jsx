import { useState, useEffect } from "react";

export default function FadeTransition({ show, duration = 200, children }) {
	const [visible, setVisible] = useState(Boolean(show));
	const [render, setRender] = useState(Boolean(show));

	useEffect(() => {
		if (show) {
			setRender(true);
			const id = requestAnimationFrame(() => setVisible(true));
			return () => cancelAnimationFrame(id);
		}
		setVisible(false);
		const timeout = window.setTimeout(() => setRender(false), duration);
		return () => window.clearTimeout(timeout);
	}, [show, duration]);

	if (!render) return null;

	return (
		<div
			className="transition-opacity"
			style={{
				opacity: visible ? 1 : 0,
				transitionDuration: `${duration}ms`,
			}}
		>
			{children}
		</div>
	);
}
