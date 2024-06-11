import * as R from "ramda";

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

export const capitalize = R.compose(
    R.join(""),
    R.juxt([R.compose(R.toUpper, R.head), R.tail]),
);