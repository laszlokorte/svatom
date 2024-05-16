
export function clamp(min, max) {
	return (v) => Math.max(min, Math.min(max, v))
}