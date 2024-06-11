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

export function scaleViewBox({
    alignmentX,
    alignmentY,
    width,
    height,
    minX,
    minY,
    scaling,
}, targetWidth, targetHeight, padding = 0) {
    if(!scaling) {
        const hPad = padding * width/targetWidth;
        const vPad = padding * height/targetHeight;

        return {
            minX: minX + hPad,
            minY: minY + vPad,
            width: Math.max(width - 2 * hPad, 0),
            height: Math.max(height - 2 * vPad, 0),
        }
    } else {
        const factor = {
            'meet': Math.max,
            'slice': Math.min,
        }[scaling].call(Math, width/targetWidth, height/targetHeight)

        const actualWidth = targetWidth * factor
        const actualHeight = targetHeight * factor
        const extraWidth = actualWidth - width
        const extraHeight = actualHeight - height

        const alignmentWeights = {
            'Min': 0,
            'Mid': 0.5,
            'Max': 1,
        };
        
        const extraWeightingX = alignmentWeights[alignmentX];
        const extraWeightingY = alignmentWeights[alignmentY];

        const actualPadding = {
            'meet': 1,
            'slice': factor,
        }[scaling] * padding;

        return {
            minX:  minX - extraWeightingX * extraWidth + actualPadding,
            minY: minY - extraWeightingY * extraHeight + actualPadding,
            width: Math.max(actualWidth - 2*actualPadding, 0),
            height: Math.max(actualHeight - 2*actualPadding, 0),
        }
    }
}