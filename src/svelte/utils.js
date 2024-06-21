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

        const actualPadding = factor * padding;

        return {
            minX:  minX - extraWeightingX * extraWidth + actualPadding,
            minY: minY - extraWeightingY * extraHeight + actualPadding,
            width: Math.max(actualWidth - 2*actualPadding, 0),
            height: Math.max(actualHeight - 2*actualPadding, 0),
        }
    }
}

export function isLeftButton(event, allowModifiers = false) {
    if (!allowModifiers && (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey)) {
        return false;
    } else if ('buttons' in event) {
        return event.buttons === 1;
    } else if ('which' in event) {
        return event.which === 1;
    } else {
        return (event.button == 1 || event.type == 'click');
    }
}


export function activeTouchMove (node, fn) {
    node.addEventListener("touchmove", fn, { passive: false });

    return {
        destroy() {
            node.removeEventListener("touchmove", fn, { passive: false });
        },
    };
};