
export function clamp(min, max) {
	return (v) => Math.max(min, Math.min(max, v))
}

export function isPlainObject(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const prototype = Object.getPrototypeOf(value);
    return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(Symbol.toStringTag in value) && !(Symbol.iterator in value);
} 